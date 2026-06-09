import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { comparePrices } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const THRESHOLD = 0.05;
const MIN_MARGIN = 0.07;
const ROW_HEIGHT = 44;       // px per row (must match td padding)
const VIEWPORT_HEIGHT = 600; // visible table body height
const OVERSCAN = 8;          // extra rows above/below viewport

const PriceComparisonPage = () => {
    const [fileName, setFileName] = useState('');
    const [results, setResults] = useState([]);   // enriched rows (meta + rec baked in)
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);

    const computeRecommendation = (file_price, competitors, cost) => {
        const prices = [];
        if (competitors.infoshina && competitors.infoshina.price != null) prices.push(competitors.infoshina.price);
        if (competitors.ukrshina && competitors.ukrshina.price != null) prices.push(competitors.ukrshina.price);
        if (prices.length === 0 || file_price == null) {
            return { type: 'none', label: '—', delta: null };
        }
        const minPrice = Math.min(...prices);
        const ratio = (file_price - minPrice) / minPrice;
        const floor = cost != null ? cost * (1 + MIN_MARGIN) : null;
        if (ratio < -THRESHOLD) {
            return { type: 'raise', label: 'Можна підняти', delta: Math.round(minPrice - file_price) };
        }
        if (ratio > THRESHOLD) {
            if (floor != null && minPrice < floor) {
                return { type: 'blocked', label: 'Маржа < 7%', delta: null };
            }
            return { type: 'lower', label: 'Варто знизити', delta: Math.round(file_price - minPrice) };
        }
        return { type: 'market', label: 'В ринку', delta: 0 };
    };

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError(null);
        setResults([]);
        setStats(null);
        setScrollTop(0);
        setLoading(true);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (rows.length < 2) throw new Error('File appears to be empty.');

            const header = rows[0].map(h => String(h).toLowerCase().trim());
            const idIdx = header.findIndex(h => h === 'id' || h === 'id товара' || h === 'my_id' || h.includes('id товара'));
            const priceIdx = header.findIndex(h => h.includes('цена продажи') || (h.includes('price') && !h.includes('out')) || h === 'цена' || h.includes('ціна продаж'));
            const nameIdx = header.findIndex(h => h.includes('название') || h.includes('назва') || h.includes('name'));
            let supplierIdx = header.findIndex(h => h.includes('поставщик') || h.includes('постачальник') || h.includes('supplier'));
            if (supplierIdx === -1) supplierIdx = 5;
            const costIdx = header.findIndex(h => h.includes('цена входа') || h.includes('ціна входу') || h.includes('cost'));
            const qtyIdx = header.findIndex(h => h.includes('кол-во') || h.includes('кількість') || h.includes('qty') || h.includes('quantity'));
            const outIdx = header.findIndex(h => h.includes('цена выхода') || h.includes('ціна виходу') || h.includes('выход') || h.includes('виход'));
            if (idIdx === -1 || priceIdx === -1) throw new Error('Could not find "id" and "price" columns.');
            if (outIdx === -1) throw new Error('Не знайдено колонку "Цена выхода" — вона потрібна для визначення ціноутворюючої позиції.');

            const stripPrefix = (s) => String(s || '')
                .replace(/^(Летн(яя|ие)|Зимн(яя|ие)|Зимов[аі]|Літн[яі]|Всесезонн(ая|ые|а|і))\s+шин[аыиыні]*\s+/i, '')
                .trim();
            const num = (v) => {
                const n = parseFloat(String(v).replace(',', '.'));
                return isNaN(n) ? null : n;
            };

            const groups = {};
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[idIdx] === undefined || row[idIdx] === '') continue;
                const id = parseInt(row[idIdx], 10);
                if (isNaN(id)) continue;
                const price = num(row[priceIdx]);
                const out = num(row[outIdx]);
                const cost = costIdx !== -1 ? num(row[costIdx]) : null;
                const qty = qtyIdx !== -1 ? (num(row[qtyIdx]) || 0) : 0;
                const supplier = supplierIdx !== -1 && row[supplierIdx] !== undefined ? String(row[supplierIdx]) : '';
                const name = nameIdx !== -1 ? stripPrefix(row[nameIdx]) : '';
                if (!groups[id]) groups[id] = { rows: [], name };
                groups[id].rows.push({ price, out, cost, qty, supplier });
            }

            const ids = Object.keys(groups).map(Number);
            if (ids.length === 0) throw new Error('No valid rows with an id found.');

            const items = [];
            const metaMap = {};
            for (const id of ids) {
                const g = groups[id];
                const depth = g.rows.length;
                let ps = g.rows.find(r => r.price != null && r.out != null && r.price === r.out);
                if (!ps) ps = g.rows[0];
                const totalQty = g.rows.reduce((s, r) => s + (r.qty || 0), 0);
                const otherQty = totalQty - (ps.qty || 0);
                items.push({ id, price: ps.price });
                metaMap[id] = {
                    name: g.name, supplier: ps.supplier, cost: ps.cost,
                    qty: ps.qty || 0, otherQty, depth,
                };
            }

            const response = await comparePrices(items);
            const rawResults = response.results || [];

            // Enrich each result ONCE: bake in meta + margin + recommendation
            const enriched = rawResults.map(r => {
                const m = metaMap[r.my_id] || {};
                const margin = (m.cost != null && r.file_price != null) ? Math.round(r.file_price - m.cost) : null;
                const marginPct = (m.cost && r.file_price != null) ? Math.round((r.file_price - m.cost) / m.cost * 100) : null;
                const rec = computeRecommendation(r.file_price, r.competitors, m.cost);
                return { ...r, m, margin, marginPct, rec };
            });

            setResults(enriched);
            setStats({ total: response.total, matched: response.matched, no_mapping: response.no_mapping });
        } catch (err) {
            console.error('Comparison error:', err);
            setError(err.message || 'Failed to process file.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleExport = () => {
        if (!results.length) return;
        const exportData = results.map(r => {
            const inf = r.competitors.infoshina || {};
            const ukr = r.competitors.ukrshina || {};
            const m = r.m || {};
            return {
                'My ID': r.my_id,
                'Товар': m.name || '',
                'Постачальник': m.supplier || '',
                'Глибина': m.depth ?? '',
                'Залишок': m.qty ?? '',
                'Залишок інших': m.otherQty ?? '',
                'Ціна входу': m.cost ?? '',
                'Маржа, грн': r.margin ?? '',
                'Маржа, %': r.marginPct ?? '',
                'My Price': r.file_price,
                'Infoshina ID': inf.competitor_id ?? '',
                'Infoshina Price': inf.price ?? '',
                'Infoshina Diff': inf.diff ?? '',
                'Infoshina Diff %': inf.diff_pct ?? '',
                'Ukrshina ID': ukr.competitor_id ?? '',
                'Ukrshina Price': ukr.price ?? '',
                'Ukrshina Diff': ukr.diff ?? '',
                'Ukrshina Diff %': ukr.diff_pct ?? '',
                'Рекомендація': r.rec.label,
                'Зміна, грн': r.rec.delta ?? '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
        XLSX.writeFile(wb, `price_comparison_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const recColor = (type) => {
        if (type === 'raise') return { bg: '#dcfce7', fg: '#15803d' };
        if (type === 'lower') return { bg: '#fee2e2', fg: '#b91c1c' };
        if (type === 'blocked') return { bg: '#fef3c7', fg: '#92400e' };
        if (type === 'market') return { bg: '#f1f5f9', fg: '#475569' };
        return { bg: 'transparent', fg: '#cbd5e1' };
    };
    const diffColor = (diff) => {
        if (diff === null || diff === undefined) return '#999';
        if (diff < 0) return '#16a34a';
        if (diff > 0) return '#dc2626';
        return '#666';
    };

    // recCounts computed once per results change
    const recCounts = useMemo(() => {
        return results.reduce((acc, r) => {
            const t = r.rec.type;
            if (acc[t] !== undefined) acc[t]++;
            return acc;
        }, { raise: 0, lower: 0, market: 0, blocked: 0 });
    }, [results]);

    // filtered computed only when results/filter/inStockOnly change
    const filtered = useMemo(() => {
        return results.filter(r => {
            const m = r.m || {};
            if (inStockOnly && !((m.qty > 0) || (m.otherQty > 0))) return false;
            if (filter === 'all') return true;
            if (filter === 'matched') return r.matched_any;
            if (filter === 'no_mapping') return !r.matched_any;
            if (['raise', 'lower', 'market', 'blocked'].includes(filter)) return r.rec.type === filter;
            return true;
        });
    }, [results, filter, inStockOnly]);

    // Virtual window
    const totalHeight = filtered.length * ROW_HEIGHT;
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN);
    const visible = filtered.slice(startIdx, endIdx);
    const offsetY = startIdx * ROW_HEIGHT;

    const renderCompetitor = (comp, withBorder) => {
        const bl = withBorder ? { borderLeft: '2px solid #e2e8f0' } : {};
        if (!comp) {
            return (<>
                <td style={{ ...td, ...bl, textAlign: 'right', color: '#cbd5e1' }}>—</td>
                <td style={{ ...td, textAlign: 'right', color: '#cbd5e1' }}>—</td>
            </>);
        }
        return (<>
            <td style={{ ...td, ...bl, textAlign: 'right' }}>{comp.price ?? '—'}</td>
            <td style={{ ...td, textAlign: 'right', color: diffColor(comp.diff), fontWeight: 600 }}>
                {comp.diff != null ? `${comp.diff > 0 ? '+' : ''}${comp.diff} (${comp.diff_pct > 0 ? '+' : ''}${comp.diff_pct}%)` : '—'}
            </td>
        </>);
    };

    return (
        <div style={{ maxWidth: 1250, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>Price Comparison</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Upload your price list. Each product is matched via the mapping table and compared
                against both infoshina and ukrshina prices.
            </p>

            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32, textAlign: 'center', background: '#f8fafc', marginBottom: 24 }}>
                <label style={{ display: 'inline-block', padding: '10px 24px', background: '#4f46e5', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
                    Choose Excel File
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                {fileName && <div style={{ marginTop: 12, color: '#475569' }}>{fileName}</div>}
            </div>

            {loading && <LoadingSpinner />}
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 16, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            {stats && (
                <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                        <div style={statCard}><span style={statNum}>{stats.total}</span><span style={statLbl}>Всього</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#16a34a' }}>{stats.matched}</span><span style={statLbl}>Зіставлено</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#15803d' }}>{recCounts.raise}</span><span style={statLbl}>Можна підняти</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#b91c1c' }}>{recCounts.lower}</span><span style={statLbl}>Варто знизити</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#92400e' }}>{recCounts.blocked}</span><span style={statLbl}>{'Маржа < 7%'}</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#475569' }}>{recCounts.market}</span><span style={statLbl}>В ринку</span></div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={inStockOnly} onChange={e => { setInStockOnly(e.target.checked); setScrollTop(0); }} />
                                Тільки в наявності
                            </label>
                            <select value={filter} onChange={e => { setFilter(e.target.value); setScrollTop(0); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                <option value="all">Всі</option>
                                <option value="matched">Зіставлені</option>
                                <option value="no_mapping">Без зіставлення</option>
                                <option value="raise">Можна підняти</option>
                                <option value="lower">Варто знизити</option>
                                <option value="blocked">{'Маржа < 7%'}</option>
                                <option value="market">В ринку</option>
                            </select>
                            <button onClick={handleExport} style={{ padding: '9px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                                Download Excel
                            </button>
                        </div>
                    </div>

                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                        Показано {filtered.length.toLocaleString()} рядків
                    </div>

                    {/* Header table (fixed) */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0', overflow: 'hidden', borderBottom: 'none' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed' }}>
                            <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={th}>My ID</th>
                                    <th style={th}>Товар</th>
                                    <th style={th}>Постач.</th>
                                    <th style={{ ...th, textAlign: 'center' }}>Глиб.</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Залишок</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Вхід</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Маржа</th>
                                    <th style={{ ...th, textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>My Price</th>
                                    <th style={{ ...th, textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>Infoshina</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff</th>
                                    <th style={{ ...th, textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>Ukrshina</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff</th>
                                    <th style={{ ...th, borderLeft: '2px solid #e2e8f0' }}>Рекоменд.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Virtualized body */}
                    <div
                        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
                        style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px' }}
                    >
                        <div style={{ height: totalHeight, position: 'relative' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed', position: 'absolute', top: offsetY, left: 0 }}>
                                <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                                <tbody>
                                    {visible.map((r, i) => {
                                        const rc = recColor(r.rec.type);
                                        const m = r.m || {};
                                        return (
                                        <tr key={startIdx + i} style={{ height: ROW_HEIGHT, borderTop: '1px solid #e2e8f0', background: r.matched_any ? 'white' : '#fff7ed' }}>
                                            <td style={td}>{r.my_id}</td>
                                            <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.name || ''}>{m.name || '—'}</td>
                                            <td style={{ ...td, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.supplier || ''}>{m.supplier || '—'}</td>
                                            <td style={{ ...td, textAlign: 'center' }}>{m.depth || '—'}</td>
                                            <td style={{ ...td, textAlign: 'right', color: m.qty > 0 ? '#15803d' : '#dc2626' }}>
                                                {m.qty ?? '—'}
                                                {!(m.qty > 0) && m.otherQty > 0 && (
                                                    <span title="Ціноутворюючої позиції немає на складі, але є інші постачальники" style={{ color: '#ea580c', fontSize: 11, marginLeft: 4 }}>(+{m.otherQty})</span>
                                                )}
                                            </td>
                                            <td style={{ ...td, textAlign: 'right' }}>{m.cost ?? '—'}</td>
                                            <td style={{ ...td, textAlign: 'right', color: r.margin != null ? (r.margin > 0 ? '#15803d' : '#dc2626') : '#999' }}>
                                                {r.margin != null ? `${r.margin}${r.marginPct != null ? ` (${r.marginPct}%)` : ''}` : '—'}
                                            </td>
                                            <td style={{ ...td, textAlign: 'right', fontWeight: 600, borderLeft: '2px solid #e2e8f0' }}>{r.file_price ?? '—'}</td>
                                            {renderCompetitor(r.competitors.infoshina, true)}
                                            {renderCompetitor(r.competitors.ukrshina, true)}
                                            <td style={{ ...td, borderLeft: '2px solid #e2e8f0' }}>
                                                {r.rec.type === 'none' ? <span style={{ color: '#cbd5e1' }}>—</span> : (
                                                    <span style={{ background: rc.bg, color: rc.fg, padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {r.rec.label}{r.rec.delta ? ` (${r.rec.delta > 0 ? '+' : ''}${r.rec.delta})` : ''}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Fixed column widths (must be same for header + body tables)
const COLS = ['80px', '200px', '120px', '60px', '90px', '80px', '110px', '90px', '90px', '120px', '90px', '120px', '140px'];

const statCard = { display: 'flex', flexDirection: 'column', padding: '12px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 100 };
const statNum = { fontSize: 24, fontWeight: 'bold' };
const statLbl = { fontSize: 12, color: '#64748b' };
const th = { padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'left' };
const td = { padding: '8px 12px', whiteSpace: 'nowrap' };

export default PriceComparisonPage;

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { comparePrices } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PriceComparisonPage = () => {
    const [fileName, setFileName] = useState('');
    const [results, setResults] = useState([]);
    const [meta, setMeta] = useState({});  // my_id -> {name, supplier, cost, qty, depth}
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all | matched | no_mapping | raise | lower | market
    const [inStockOnly, setInStockOnly] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError(null);
        setResults([]);
        setStats(null);
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
            if (idIdx === -1 || priceIdx === -1) {
                throw new Error('Could not find "id" and "price" columns.');
            }
            if (outIdx === -1) {
                throw new Error('Не знайдено колонку "Цена выхода" — вона потрібна для визначення ціноутворюючої позиції.');
            }

            const stripPrefix = (s) => String(s || '')
                .replace(/^(Летн(яя|ие)|Зимн(яя|ие)|Зимов[аі]|Літн[яі]|Всесезонн(ая|ые|а|і))\s+шин[аыиыні]*\s+/i, '')
                .trim();
            const num = (v) => {
                const n = parseFloat(String(v).replace(',', '.'));
                return isNaN(n) ? null : n;
            };

            // Group by id. Price-setting position = row where Цена продажи == Цена выхода.
            const groups = {};  // id -> { rows: [...], depth }
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
                // Find price-setting row: продажа == выход (exact)
                let ps = g.rows.find(r => r.price != null && r.out != null && r.price === r.out);
                if (!ps) ps = g.rows[0];  // safety fallback (shouldn't happen per business rule)

                // Stock across other positions (for the "in stock but not price-setting" hint)
                const totalQty = g.rows.reduce((s, r) => s + (r.qty || 0), 0);
                const otherQty = totalQty - (ps.qty || 0);

                items.push({ id, price: ps.price });
                metaMap[id] = {
                    name: g.name,
                    supplier: ps.supplier,
                    cost: ps.cost,
                    qty: ps.qty || 0,          // stock of the price-setting position
                    otherQty: otherQty,        // stock available in other positions
                    depth: depth,
                };
            }
            setMeta(metaMap);

            const response = await comparePrices(items);
            setResults(response.results || []);
            setStats({
                total: response.total,
                matched: response.matched,
                no_mapping: response.no_mapping
            });
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
            const rec = getRecommendation(r);
            const m = meta[r.my_id] || {};
            const margin = (m.cost != null && r.file_price != null) ? Math.round(r.file_price - m.cost) : '';
            const marginPct = (m.cost && r.file_price != null) ? Math.round((r.file_price - m.cost) / m.cost * 100) : '';
            return {
                'My ID': r.my_id,
                'Товар': m.name || '',
                'Постачальник': m.supplier || '',
                'Глибина': m.depth ?? '',
                'Залишок': m.qty ?? '',
                'Залишок інших': m.otherQty ?? '',
                'Ціна входу': m.cost ?? '',
                'Маржа, грн': margin,
                'Маржа, %': marginPct,
                'My Price': r.file_price,
                'Infoshina ID': inf.competitor_id ?? '',
                'Infoshina Price': inf.price ?? '',
                'Infoshina Diff': inf.diff ?? '',
                'Infoshina Diff %': inf.diff_pct ?? '',
                'Ukrshina ID': ukr.competitor_id ?? '',
                'Ukrshina Price': ukr.price ?? '',
                'Ukrshina Diff': ukr.diff ?? '',
                'Ukrshina Diff %': ukr.diff_pct ?? '',
                'Рекомендація': rec.label,
                'Зміна, грн': rec.delta ?? '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
        XLSX.writeFile(wb, `price_comparison_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Recommendation based on minimum competitor price, 5% threshold
    const THRESHOLD = 0.05;
    const MIN_MARGIN = 0.07;  // floor: price must stay >= cost * 1.07
    const getRecommendation = (r) => {
        const prices = [];
        if (r.competitors.infoshina && r.competitors.infoshina.price != null) prices.push(r.competitors.infoshina.price);
        if (r.competitors.ukrshina && r.competitors.ukrshina.price != null) prices.push(r.competitors.ukrshina.price);
        if (prices.length === 0 || r.file_price == null) {
            return { type: 'none', label: '—', minPrice: null, delta: null };
        }
        const minPrice = Math.min(...prices);
        const ratio = (r.file_price - minPrice) / minPrice;
        const m = meta[r.my_id] || {};
        const floor = m.cost != null ? m.cost * (1 + MIN_MARGIN) : null;  // min allowed price

        if (ratio < -THRESHOLD) {
            // below min competitor — can raise toward market
            return { type: 'raise', label: 'Можна підняти', minPrice, delta: Math.round(minPrice - r.file_price) };
        }
        if (ratio > THRESHOLD) {
            // above min competitor — want to lower, but not below floor
            if (floor != null && minPrice < floor) {
                // competitor is below our cost+margin floor — can't compete profitably
                return { type: 'blocked', label: 'Маржа < 7%', minPrice, delta: null };
            }
            return { type: 'lower', label: 'Варто знизити', minPrice, delta: Math.round(r.file_price - minPrice) };
        }
        return { type: 'market', label: 'В ринку', minPrice, delta: 0 };
    };

    const recColor = (type) => {
        if (type === 'raise') return { bg: '#dcfce7', fg: '#15803d' };
        if (type === 'lower') return { bg: '#fee2e2', fg: '#b91c1c' };
        if (type === 'blocked') return { bg: '#fef3c7', fg: '#92400e' };  // amber - can't compete
        if (type === 'market') return { bg: '#f1f5f9', fg: '#475569' };
        return { bg: 'transparent', fg: '#cbd5e1' };
    };

    const filtered = results.filter(r => {
        const m = meta[r.my_id] || {};
        if (inStockOnly && !((m.qty > 0) || (m.otherQty > 0))) return false;
        if (filter === 'all') return true;
        if (filter === 'matched') return r.matched_any;
        if (filter === 'no_mapping') return !r.matched_any;
        if (['raise', 'lower', 'market', 'blocked'].includes(filter)) {
            return getRecommendation(r).type === filter;
        }
        return true;
    });

    const recCounts = results.reduce((acc, r) => {
        const t = getRecommendation(r).type;
        if (acc[t] !== undefined) acc[t]++;
        return acc;
    }, { raise: 0, lower: 0, market: 0, blocked: 0 });

    const diffColor = (diff) => {
        if (diff === null || diff === undefined) return '#999';
        if (diff < 0) return '#16a34a';  // your price lower = good = green
        if (diff > 0) return '#dc2626';  // higher = red
        return '#666';
    };

    const renderCompetitorCells = (comp, withBorder) => {
        const borderStyle = withBorder ? { borderLeft: '2px solid #e2e8f0' } : {};
        if (!comp) {
            return (
                <>
                    <td style={{ ...td, ...borderStyle, textAlign: 'right', color: '#cbd5e1' }}>—</td>
                    <td style={{ ...td, textAlign: 'right', color: '#cbd5e1' }}>—</td>
                </>
            );
        }
        return (
            <>
                <td style={{ ...td, ...borderStyle, textAlign: 'right' }}>{comp.price ?? '—'}</td>
                <td style={{ ...td, textAlign: 'right', color: diffColor(comp.diff), fontWeight: 600 }}>
                    {comp.diff != null ? `${comp.diff > 0 ? '+' : ''}${comp.diff} (${comp.diff_pct > 0 ? '+' : ''}${comp.diff_pct}%)` : '—'}
                </td>
            </>
        );
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
                        <div style={statCard}><span style={{ ...statNum, color: '#92400e' }}>{recCounts.blocked}</span><span style={statLbl}>Маржа < 7%</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#475569' }}>{recCounts.market}</span><span style={statLbl}>В ринку</span></div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
                                Тільки в наявності
                            </label>
                            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                <option value="all">Всі</option>
                                <option value="matched">Зіставлені</option>
                                <option value="no_mapping">Без зіставлення</option>
                                <option value="raise">Можна підняти</option>
                                <option value="lower">Варто знизити</option>
                                <option value="blocked">Маржа < 7%</option>
                                <option value="market">В ринку</option>
                            </select>
                            <button onClick={handleExport} style={{ padding: '9px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                                Download Excel
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
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
                                    <th style={{ ...th, borderLeft: '2px solid #e2e8f0' }}>Рекомендація</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const rec = getRecommendation(r);
                                    const rc = recColor(rec.type);
                                    const m = meta[r.my_id] || {};
                                    const margin = (m.cost != null && r.file_price != null) ? Math.round(r.file_price - m.cost) : null;
                                    const marginPct = (m.cost && r.file_price != null) ? Math.round((r.file_price - m.cost) / m.cost * 100) : null;
                                    return (
                                    <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: r.matched_any ? 'white' : '#fff7ed' }}>
                                        <td style={td}>{r.my_id}</td>
                                        <td style={{ ...td, whiteSpace: 'normal', maxWidth: 240 }}>{m.name || '—'}</td>
                                        <td style={{ ...td, whiteSpace: 'normal', maxWidth: 140, fontSize: 12 }}>{m.supplier || '—'}</td>
                                        <td style={{ ...td, textAlign: 'center' }}>{m.depth || '—'}</td>
                                        <td style={{ ...td, textAlign: 'right', color: m.qty > 0 ? '#15803d' : '#dc2626' }}>
                                            {m.qty ?? '—'}
                                            {!(m.qty > 0) && m.otherQty > 0 && (
                                                <span title="Ціноутворюючої позиції немає на складі, але є інші постачальники" style={{ color: '#ea580c', fontSize: 11, marginLeft: 4 }}>
                                                    (+{m.otherQty})
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ ...td, textAlign: 'right' }}>{m.cost ?? '—'}</td>
                                        <td style={{ ...td, textAlign: 'right', color: margin != null ? (margin > 0 ? '#15803d' : '#dc2626') : '#999' }}>
                                            {margin != null ? `${margin}${marginPct != null ? ` (${marginPct}%)` : ''}` : '—'}
                                        </td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, borderLeft: '2px solid #e2e8f0' }}>{r.file_price ?? '—'}</td>
                                        {renderCompetitorCells(r.competitors.infoshina, true)}
                                        {renderCompetitorCells(r.competitors.ukrshina, true)}
                                        <td style={{ ...td, borderLeft: '2px solid #e2e8f0' }}>
                                            {rec.type === 'none' ? <span style={{ color: '#cbd5e1' }}>—</span> : (
                                                <span style={{ background: rc.bg, color: rc.fg, padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {rec.label}
                                                    {rec.delta ? ` (${rec.delta > 0 ? '+' : ''}${rec.delta} грн)` : ''}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

const statCard = { display: 'flex', flexDirection: 'column', padding: '12px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 100 };
const statNum = { fontSize: 24, fontWeight: 'bold' };
const statLbl = { fontSize: 12, color: '#64748b' };
const th = { padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', whiteSpace: 'nowrap' };

export default PriceComparisonPage;

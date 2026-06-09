import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { comparePrices } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const PriceComparisonPage = () => {
    const [fileName, setFileName] = useState('');
    const [results, setResults] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all | matched | no_mapping

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
            const priceIdx = header.findIndex(h => h.includes('цена продажи') || h.includes('price') || h === 'цена' || h.includes('ціна'));
            if (idIdx === -1 || priceIdx === -1) {
                throw new Error('Could not find "id" and "price" columns.');
            }

            const seen = new Set();
            const items = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[idIdx] === undefined || row[idIdx] === '') continue;
                const id = parseInt(row[idIdx], 10);
                if (isNaN(id) || seen.has(id)) continue;
                seen.add(id);
                items.push({ id, price: row[priceIdx] });
            }
            if (items.length === 0) throw new Error('No valid rows with an id found.');

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
            return {
                'My ID': r.my_id,
                'My Price': r.file_price,
                'Infoshina ID': inf.competitor_id ?? '',
                'Infoshina Price': inf.price ?? '',
                'Infoshina Diff': inf.diff ?? '',
                'Infoshina Diff %': inf.diff_pct ?? '',
                'Ukrshina ID': ukr.competitor_id ?? '',
                'Ukrshina Price': ukr.price ?? '',
                'Ukrshina Diff': ukr.diff ?? '',
                'Ukrshina Diff %': ukr.diff_pct ?? '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
        XLSX.writeFile(wb, `price_comparison_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const filtered = results.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'matched') return r.matched_any;
        if (filter === 'no_mapping') return !r.matched_any;
        return true;
    });

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
                        <div style={statCard}><span style={statNum}>{stats.total}</span><span style={statLbl}>Total rows</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#16a34a' }}>{stats.matched}</span><span style={statLbl}>Matched</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#ea580c' }}>{stats.no_mapping}</span><span style={statLbl}>No mapping</span></div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                <option value="all">All</option>
                                <option value="matched">Matched</option>
                                <option value="no_mapping">No mapping</option>
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
                                    <th style={{ ...th, textAlign: 'right' }}>My Price</th>
                                    <th style={{ ...th, textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>Infoshina</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff</th>
                                    <th style={{ ...th, textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>Ukrshina</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: r.matched_any ? 'white' : '#fff7ed' }}>
                                        <td style={td}>{r.my_id}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.file_price ?? '—'}</td>
                                        {renderCompetitorCells(r.competitors.infoshina, true)}
                                        {renderCompetitorCells(r.competitors.ukrshina, true)}
                                    </tr>
                                ))}
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

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
    const [filter, setFilter] = useState('all'); // all | matched | no_mapping | no_tire

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

            if (rows.length < 2) {
                throw new Error('File appears to be empty or has no data rows.');
            }

            // Detect columns from header (case-insensitive)
            const header = rows[0].map(h => String(h).toLowerCase().trim());
            const idIdx = header.findIndex(h => h === 'id' || h === 'id товара' || h === 'my_id' || h.includes('id товара'));
            const priceIdx = header.findIndex(h => h.includes('цена продажи') || h.includes('price') || h === 'цена' || h.includes('ціна'));

            if (idIdx === -1 || priceIdx === -1) {
                throw new Error('Could not find required "id" and "price" columns. Expected columns like "Id товара" and "Цена продажи".');
            }

            // Deduplicate by id (file may repeat the same product for different suppliers)
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

            if (items.length === 0) {
                throw new Error('No valid rows with an id found.');
            }

            const response = await comparePrices(items);
            setResults(response.results || []);
            setStats({
                total: response.total,
                matched: response.matched,
                no_mapping: response.no_mapping,
                no_tire: response.no_tire
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

        const statusLabel = (s) =>
            s === 'matched' ? 'Matched' : s === 'no_mapping' ? 'No mapping' : 'Tire missing';

        const exportData = results.map(r => ({
            'My ID': r.my_id,
            'Infoshina ID': r.infoshina_id,
            'Infoshina Name': r.infoshina_name || '',
            'Infoshina Brand': r.infoshina_brand || '',
            'My Price': r.file_price,
            'Infoshina Price': r.infoshina_price,
            'Difference': r.diff,
            'Difference %': r.diff_pct,
            'Status': statusLabel(r.status)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
        XLSX.writeFile(wb, `price_comparison_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const filtered = results.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    const diffColor = (diff) => {
        if (diff === null || diff === undefined) return '#999';
        if (diff > 0) return '#16a34a';   // your price higher than infoshina = green (you can lower / more margin)
        if (diff < 0) return '#dc2626';   // your price lower = red
        return '#666';
    };

    return (
        <div style={{ maxWidth: 1150, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>Price Comparison</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Upload your price list (Excel). Products are matched to infoshina via the mapping table,
                then your prices are compared against current infoshina prices.
            </p>

            <div style={{
                border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32,
                textAlign: 'center', background: '#f8fafc', marginBottom: 24
            }}>
                <label style={{
                    display: 'inline-block', padding: '10px 24px', background: '#4f46e5',
                    color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}>
                    Choose Excel File
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
                </label>
                {fileName && <div style={{ marginTop: 12, color: '#475569' }}>{fileName}</div>}
            </div>

            {loading && <LoadingSpinner />}

            {error && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {stats && (
                <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                        <div style={statCard}><span style={statNum}>{stats.total}</span><span style={statLbl}>Total rows</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#16a34a' }}>{stats.matched}</span><span style={statLbl}>Matched</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#ea580c' }}>{stats.no_mapping}</span><span style={statLbl}>No mapping</span></div>
                        <div style={statCard}><span style={{ ...statNum, color: '#dc2626' }}>{stats.no_tire}</span><span style={statLbl}>Tire missing</span></div>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                <option value="all">All</option>
                                <option value="matched">Matched</option>
                                <option value="no_mapping">No mapping</option>
                                <option value="no_tire">Tire missing</option>
                            </select>
                            <button onClick={handleExport} style={{
                                padding: '9px 20px', background: '#16a34a', color: 'white',
                                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold'
                            }}>
                                Download Excel
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                    <th style={th}>My ID</th>
                                    <th style={th}>Infoshina ID</th>
                                    <th style={th}>Name (infoshina)</th>
                                    <th style={th}>Brand</th>
                                    <th style={{ ...th, textAlign: 'right' }}>My Price</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Infoshina Price</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Diff %</th>
                                    <th style={th}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const bg = r.status === 'matched' ? 'white' : r.status === 'no_mapping' ? '#fff7ed' : '#fef2f2';
                                    return (
                                        <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: bg }}>
                                            <td style={td}>{r.my_id}</td>
                                            <td style={td}>{r.infoshina_id ?? '—'}</td>
                                            <td style={td}>{r.infoshina_name || '—'}</td>
                                            <td style={td}>{r.infoshina_brand || '—'}</td>
                                            <td style={{ ...td, textAlign: 'right' }}>{r.file_price ?? '—'}</td>
                                            <td style={{ ...td, textAlign: 'right' }}>{r.infoshina_price ?? '—'}</td>
                                            <td style={{ ...td, textAlign: 'right', color: diffColor(r.diff), fontWeight: 600 }}>
                                                {r.diff != null ? (r.diff > 0 ? '+' : '') + r.diff : '—'}
                                            </td>
                                            <td style={{ ...td, textAlign: 'right', color: diffColor(r.diff), fontWeight: 600 }}>
                                                {r.diff_pct != null ? (r.diff_pct > 0 ? '+' : '') + r.diff_pct + '%' : '—'}
                                            </td>
                                            <td style={td}>
                                                {r.status === 'matched' && <span style={{ color: '#16a34a' }}>Matched</span>}
                                                {r.status === 'no_mapping' && <span style={{ color: '#ea580c' }}>No mapping</span>}
                                                {r.status === 'no_tire' && <span style={{ color: '#dc2626' }}>Tire missing</span>}
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

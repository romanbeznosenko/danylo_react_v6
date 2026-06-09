import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { mappingAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const SOURCES = ['infoshina', 'ukrshina'];

const MappingPage = () => {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [search, setSearch] = useState('');

    // Manual add
    const [newMyId, setNewMyId] = useState('');
    const [newSource, setNewSource] = useState('infoshina');
    const [newCompId, setNewCompId] = useState('');

    // Bulk source (for 2-column files)
    const [bulkSource, setBulkSource] = useState('infoshina');

    const loadMappings = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await mappingAPI.list();
            setMappings(data.mappings || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load mappings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMappings(); }, []);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMessage(null);
        setError(null);
        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (rows.length < 2) throw new Error('File has no data rows.');

            // Detect: 3-column (my_id, source, competitor_id) or 2-column (my_id, competitor_id) + bulkSource
            const header = rows[0].map(h => String(h).toLowerCase().trim());
            const sourceIdx = header.findIndex(h => h.includes('source') || h.includes('источник') || h.includes('джерело'));

            const triples = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[0] === undefined) continue;
                if (sourceIdx !== -1) {
                    // 3-column: my_id, source, competitor_id (source in its column)
                    const cols = [0, 1, 2].filter(c => c !== sourceIdx);
                    const myId = parseInt(row[cols[0]], 10);
                    const compId = parseInt(row[cols[1]], 10);
                    const src = String(row[sourceIdx]).trim().toLowerCase();
                    if (!isNaN(myId) && !isNaN(compId) && src) triples.push([myId, src, compId]);
                } else {
                    // 2-column: my_id, competitor_id + selected bulkSource
                    const myId = parseInt(row[0], 10);
                    const compId = parseInt(row[1], 10);
                    if (!isNaN(myId) && !isNaN(compId)) triples.push([myId, bulkSource, compId]);
                }
            }

            if (triples.length === 0) throw new Error('No valid rows found.');

            const res = await mappingAPI.bulk(triples);
            setMessage(`${res.count} mappings saved.`);
            await loadMappings();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to upload.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleAdd = async () => {
        if (!newMyId || !newCompId) return;
        setError(null); setMessage(null);
        try {
            await mappingAPI.add(parseInt(newMyId, 10), newSource, parseInt(newCompId, 10));
            setNewMyId(''); setNewCompId('');
            setMessage('Mapping added.');
            await loadMappings();
        } catch (err) {
            console.error(err);
            setError('Failed to add mapping.');
        }
    };

    const handleDelete = async (myId, source) => {
        try {
            await mappingAPI.remove(myId, source);
            await loadMappings();
        } catch (err) {
            console.error(err);
            setError('Failed to delete.');
        }
    };

    const filtered = mappings.filter(m => {
        if (!search) return true;
        const s = search.toLowerCase();
        if (String(m.my_id).includes(s)) return true;
        return Object.values(m.sources).some(v =>
            String(v.competitor_id).includes(s) || (v.name || '').toLowerCase().includes(s)
        );
    });

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>ID Mapping</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Link your product IDs to competitor tire IDs (infoshina, ukrshina). One mapping per
                competitor for each of your products.
            </p>

            {message && <div style={{ background: '#f0fdf4', color: '#15803d', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {/* Bulk upload */}
                <div style={{ flex: 1, minWidth: 280, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Bulk upload</h3>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                        Excel with 2 columns (your ID, competitor ID) — select source below.
                        Or 3 columns with a "source" header.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={bulkSource} onChange={e => setBulkSource(e.target.value)} style={sel}>
                            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <label style={{ display: 'inline-block', padding: '8px 18px', background: '#4f46e5', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                            Upload Excel
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                {/* Manual add */}
                <div style={{ flex: 1, minWidth: 280, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Add manually</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input type="number" placeholder="Your ID" value={newMyId} onChange={e => setNewMyId(e.target.value)} style={{ ...inp, minWidth: 90 }} />
                        <select value={newSource} onChange={e => setNewSource(e.target.value)} style={sel}>
                            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="number" placeholder="Competitor ID" value={newCompId} onChange={e => setNewCompId(e.target.value)} style={{ ...inp, minWidth: 110 }} />
                        <button onClick={handleAdd} style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Mappings ({mappings.length} products)</h3>
                <input placeholder="Search by ID or name..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, minWidth: 240 }} />
            </div>

            {loading ? <LoadingSpinner /> : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                <th style={th}>My ID</th>
                                <th style={th}>Infoshina</th>
                                <th style={th}>Ukrshina</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td style={td} colSpan={3}>No mappings yet.</td></tr>
                            ) : filtered.map((m, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                                    <td style={{ ...td, fontWeight: 600 }}>{m.my_id}</td>
                                    {SOURCES.map(src => {
                                        const v = m.sources[src];
                                        return (
                                            <td key={src} style={td}>
                                                {v ? (
                                                    <div>
                                                        <div>ID: {v.competitor_id}</div>
                                                        <div style={{ color: '#64748b', fontSize: 13 }}>
                                                            {v.name ? `${v.brand || ''} ${v.name}` : <span style={{ color: '#dc2626' }}>not in DB</span>}
                                                        </div>
                                                        <div style={{ fontSize: 13 }}>{v.price != null ? `${v.price} грн` : ''}</div>
                                                        <button onClick={() => handleDelete(m.my_id, src)} style={{ marginTop: 4, padding: '2px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const th = { padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { padding: '8px 12px' };
const inp = { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 };
const sel = { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white' };

export default MappingPage;

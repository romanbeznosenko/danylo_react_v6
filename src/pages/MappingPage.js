import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { mappingAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MappingPage = () => {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [search, setSearch] = useState('');

    // Manual add form
    const [newMyId, setNewMyId] = useState('');
    const [newInfoshinaId, setNewInfoshinaId] = useState('');

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

            // Detect columns: my_id and infoshina_id
            const header = rows[0].map(h => String(h).toLowerCase().trim());
            const myIdx = header.findIndex(h => h.includes('my') || h === 'id товара' || h.includes('мой') || h.includes('id товара'));
            const infIdx = header.findIndex(h => h.includes('infoshina') || h.includes('инфошина') || h.includes('tire_id'));

            let mi = myIdx, ii = infIdx;
            // Fallback: assume first two columns are my_id, infoshina_id
            if (mi === -1 || ii === -1) {
                mi = 0; ii = 1;
            }

            const pairs = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[mi] === undefined || row[ii] === undefined) continue;
                const a = parseInt(row[mi], 10);
                const b = parseInt(row[ii], 10);
                if (!isNaN(a) && !isNaN(b)) pairs.push([a, b]);
            }

            if (pairs.length === 0) throw new Error('No valid (my_id, infoshina_id) pairs found.');

            const res = await mappingAPI.bulk(pairs);
            setMessage(`${res.count} mappings saved.`);
            await loadMappings();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to upload mappings.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleAdd = async () => {
        if (!newMyId || !newInfoshinaId) return;
        setError(null);
        setMessage(null);
        try {
            await mappingAPI.add(parseInt(newMyId, 10), parseInt(newInfoshinaId, 10));
            setNewMyId('');
            setNewInfoshinaId('');
            setMessage('Mapping added.');
            await loadMappings();
        } catch (err) {
            console.error(err);
            setError('Failed to add mapping.');
        }
    };

    const handleDelete = async (myId) => {
        try {
            await mappingAPI.remove(myId);
            setMappings(prev => prev.filter(m => m.my_id !== myId));
        } catch (err) {
            console.error(err);
            setError('Failed to delete mapping.');
        }
    };

    const filtered = mappings.filter(m => {
        if (!search) return true;
        const s = search.toLowerCase();
        return String(m.my_id).includes(s)
            || String(m.infoshina_id).includes(s)
            || (m.infoshina_name || '').toLowerCase().includes(s);
    });

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>ID Mapping</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Link your product IDs to infoshina tire IDs (one-to-one). Upload an Excel with two
                columns (your ID, infoshina ID) or add links manually.
            </p>

            {message && <div style={{ background: '#f0fdf4', color: '#15803d', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            {/* Upload + manual add */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{ flex: 1, minWidth: 260, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Bulk upload</h3>
                    <p style={{ fontSize: 13, color: '#64748b' }}>Excel columns: your ID, infoshina ID (first two columns).</p>
                    <label style={{ display: 'inline-block', padding: '8px 18px', background: '#4f46e5', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                        Upload Excel
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                </div>

                <div style={{ flex: 1, minWidth: 260, border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Add manually</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                            type="number" placeholder="Your ID" value={newMyId}
                            onChange={e => setNewMyId(e.target.value)}
                            style={{ flex: 1, minWidth: 100, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                        />
                        <input
                            type="number" placeholder="Infoshina ID" value={newInfoshinaId}
                            onChange={e => setNewInfoshinaId(e.target.value)}
                            style={{ flex: 1, minWidth: 100, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                        />
                        <button onClick={handleAdd} style={{ padding: '8px 18px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Existing mappings ({mappings.length})</h3>
                <input
                    placeholder="Search by ID or name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, minWidth: 240 }}
                />
            </div>

            {loading ? <LoadingSpinner /> : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                <th style={th}>My ID</th>
                                <th style={th}>Infoshina ID</th>
                                <th style={th}>Infoshina Name</th>
                                <th style={th}>Brand</th>
                                <th style={{ ...th, textAlign: 'right' }}>Infoshina Price</th>
                                <th style={th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td style={td} colSpan={6}>No mappings yet.</td></tr>
                            ) : filtered.map((m, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                                    <td style={td}>{m.my_id}</td>
                                    <td style={td}>{m.infoshina_id}</td>
                                    <td style={td}>{m.infoshina_name || <span style={{ color: '#dc2626' }}>not in DB</span>}</td>
                                    <td style={td}>{m.infoshina_brand || '—'}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>{m.infoshina_price ?? '—'}</td>
                                    <td style={{ ...td, textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(m.my_id)} style={{ padding: '4px 12px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                            Delete
                                        </button>
                                    </td>
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
const td = { padding: '8px 12px', whiteSpace: 'nowrap' };

export default MappingPage;

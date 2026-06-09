import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { ukrshinaAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const PAGE_SIZE = 50;

const UkrshinaPage = () => {
    const [stats, setStats] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [fileName, setFileName] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);

    // List state
    const [tires, setTires] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [listLoading, setListLoading] = useState(false);

    // Modal
    const [selectedTire, setSelectedTire] = useState(null);

    const loadStats = async () => {
        try {
            const data = await ukrshinaAPI.stats();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadTires = useCallback(async () => {
        setListLoading(true);
        try {
            const data = await ukrshinaAPI.list(search, PAGE_SIZE, page * PAGE_SIZE);
            setTires(data.tires || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    }, [search, page]);

    useEffect(() => { loadStats(); }, []);
    useEffect(() => { loadTires(); }, [loadTires]);

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError(null);
        setMessage(null);
        setUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (rows.length < 2) throw new Error('Файл порожній або без даних.');

            const header = rows[0].map(h => String(h).toLowerCase().trim());
            const col = (names) => header.findIndex(h => names.includes(h));
            const idIdx = col(['id', 'tire_id']);
            const nameIdx = col(['name', 'назва', 'название']);
            const brandIdx = col(['brand', 'бренд']);
            const modelIdx = col(['model', 'модель']);
            const widthIdx = col(['width', 'ширина']);
            const profilIdx = col(['profil', 'профиль', 'профіль']);
            const diametrIdx = col(['diametr', 'диаметр', 'діаметр']);
            const seasonIdx = col(['season', 'сезон']);
            const priceIdx = col(['price', 'цена', 'ціна']);

            if (idIdx === -1 || priceIdx === -1) {
                throw new Error('Не знайдено обовʼязкові колонки "id" та "price".');
            }

            const arr = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[idIdx] === undefined || row[idIdx] === '') continue;
                arr.push({
                    id: parseInt(row[idIdx], 10),
                    name: nameIdx !== -1 ? row[nameIdx] : '',
                    brand: brandIdx !== -1 ? row[brandIdx] : '',
                    model: modelIdx !== -1 ? row[modelIdx] : '',
                    width: widthIdx !== -1 ? row[widthIdx] : '',
                    profil: profilIdx !== -1 ? row[profilIdx] : '',
                    diametr: diametrIdx !== -1 ? row[diametrIdx] : '',
                    season: seasonIdx !== -1 ? row[seasonIdx] : '',
                    price: row[priceIdx]
                });
            }
            if (arr.length === 0) throw new Error('Не знайдено рядків з id.');

            const res = await ukrshinaAPI.upload(arr);
            setMessage(`Завантажено ${res.saved} шин у базу ukrshina.`);
            await loadStats();
            await loadTires();
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Не вдалося обробити файл.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSearch = (e) => {
        setPage(0);
        setSearch(e.target.value);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>Ukrshina</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Дані ukrshina.com.ua збираються локальним парсером, потім завантажуються сюди (Excel).
            </p>

            {/* Stats */}
            {stats && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={statCard}>
                        <span style={statNum}>{stats.count.toLocaleString()}</span>
                        <span style={statLbl}>Шин у базі</span>
                    </div>
                    <div style={statCard}>
                        <span style={statNum}>{stats.last_upload || '—'}</span>
                        <span style={statLbl}>Останнє завантаження</span>
                    </div>
                </div>
            )}

            {/* Upload */}
            <div style={{
                border: '2px dashed #cbd5e1', borderRadius: 12, padding: 24,
                textAlign: 'center', background: '#f8fafc', marginBottom: 16
            }}>
                <label style={{
                    display: 'inline-block', padding: '10px 24px',
                    background: uploading ? '#9ca3af' : '#4f46e5',
                    color: 'white', borderRadius: 8, cursor: uploading ? 'default' : 'pointer', fontWeight: 'bold'
                }}>
                    {uploading ? 'Завантаження...' : 'Вибрати Excel-файл'}
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
                </label>
                {fileName && <div style={{ marginTop: 12, color: '#475569' }}>{fileName}</div>}
            </div>

            {message && <div style={{ background: '#f0fdf4', color: '#15803d', padding: 12, borderRadius: 8, marginBottom: 16 }}>{message}</div>}
            {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

            {/* Instructions */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}
                >
                    {showInstructions ? '▼' : '▶'} Як зібрати дані ukrshina (інструкція)
                </button>
                {showInstructions && (
                    <div style={{ padding: 16, lineHeight: 1.7, color: '#334155', fontSize: 14 }}>
                        <p><strong>1.</strong> Відкрий <code>ukrshina.com.ua/uk/shiny</code>, F12 → Application → Cookies → скопіюй <code>cf_clearance</code> та свій User-Agent.</p>
                        <p><strong>2.</strong> Встав їх у <code>ukrshina_cffi.py</code> (CF_CLEARANCE, USER_AGENT), вкажи PAGES_TO_PARSE.</p>
                        <p><strong>3.</strong> Запусти <code>python ukrshina_cffi.py</code> — створиться <code>ukrshina_tires_*.xlsx</code>.</p>
                        <p><strong>4.</strong> Завантаж файл кнопкою вище.</p>
                        <p style={{ color: '#94a3b8' }}>Кука живе кілька годин і прив'язана до IP.</p>
                    </div>
                )}
            </div>

            {/* Tire list */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Шини ukrshina ({total.toLocaleString()})</h3>
                <input
                    placeholder="Пошук за назвою / брендом / моделлю..."
                    value={search}
                    onChange={handleSearch}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, minWidth: 300 }}
                />
            </div>

            {listLoading ? <LoadingSpinner /> : (
                <>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                    <th style={th}>ID</th>
                                    <th style={th}>Бренд</th>
                                    <th style={th}>Модель</th>
                                    <th style={th}>Розмір</th>
                                    <th style={th}>Сезон</th>
                                    <th style={{ ...th, textAlign: 'right' }}>Ціна</th>
                                    <th style={th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tires.length === 0 ? (
                                    <tr><td style={td} colSpan={7}>Немає даних. Завантаж файл вище.</td></tr>
                                ) : tires.map((t, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                                        <td style={td}>{t.tire_id}</td>
                                        <td style={td}>{t.brand || '—'}</td>
                                        <td style={td}>{t.model || '—'}</td>
                                        <td style={td}>{t.width}/{t.profil} {t.diametr}</td>
                                        <td style={td}>{t.season || '—'}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{t.price} грн</td>
                                        <td style={{ ...td, textAlign: 'right' }}>
                                            <button onClick={() => setSelectedTire(t)} style={{ padding: '4px 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                                                Історія
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtn}>←</button>
                            <span style={{ fontSize: 14 }}>{page + 1} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={pageBtn}>→</button>
                        </div>
                    )}
                </>
            )}

            {selectedTire && (
                <UkrshinaHistoryModal tire={selectedTire} onClose={() => setSelectedTire(null)} />
            )}
        </div>
    );
};

// ── History modal with chart ───────────────────────────────
const UkrshinaHistoryModal = ({ tire, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await ukrshinaAPI.priceHistory(tire.tire_id);
                setHistory(data.price_history || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [tire]);

    const chartData = history.map(p => ({
        time: p.recorded_at.slice(5, 16),
        price: p.price
    }));
    const prices = history.map(p => p.price);
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 640, width: '92%', maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{tire.name || `${tire.brand} ${tire.model}`}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                    ID: {tire.tire_id} • {tire.width}/{tire.profil} {tire.diametr} • {tire.season}
                </div>

                {loading ? <LoadingSpinner /> : history.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>Історія цін поки порожня (потрібно щонайменше 2 завантаження в різний час).</p>
                ) : (
                    <>
                        <div style={{ width: '100%', height: 240, marginBottom: 16 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                                    <Tooltip formatter={(v) => [`${v} грн`, 'Ціна']} />
                                    <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                            <div>Поточна: <strong>{tire.price} грн</strong></div>
                            <div>Мін: <strong>{minP} грн</strong></div>
                            <div>Макс: <strong>{maxP} грн</strong></div>
                            <div>Точок: <strong>{history.length}</strong></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const statCard = { display: 'flex', flexDirection: 'column', padding: '14px 22px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 140 };
const statNum = { fontSize: 20, fontWeight: 'bold' };
const statLbl = { fontSize: 12, color: '#64748b', marginTop: 4 };
const th = { padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', whiteSpace: 'nowrap' };
const pageBtn = { padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: 'white', cursor: 'pointer' };

export default UkrshinaPage;

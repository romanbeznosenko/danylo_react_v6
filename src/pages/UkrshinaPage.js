import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ukrshinaAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const UkrshinaPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [fileName, setFileName] = useState('');
    const [showInstructions, setShowInstructions] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await ukrshinaAPI.stats();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStats(); }, []);

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

            if (rows.length < 2) {
                throw new Error('Файл порожній або без даних.');
            }

            // Detect columns from header
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

            const tires = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row[idIdx] === undefined || row[idIdx] === '') continue;
                tires.push({
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

            if (tires.length === 0) {
                throw new Error('Не знайдено рядків з id.');
            }

            const res = await ukrshinaAPI.upload(tires);
            setMessage(`Завантажено ${res.saved} шин у базу ukrshina.`);
            await loadStats();
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Не вдалося обробити файл.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ marginBottom: 8 }}>Ukrshina</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
                Дані ukrshina.com.ua збираються локальним парсером (через Cloudflare-куку),
                а потім завантажуються сюди у вигляді Excel-файлу.
            </p>

            {/* Stats */}
            {loading ? <LoadingSpinner /> : stats && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
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
                border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32,
                textAlign: 'center', background: '#f8fafc', marginBottom: 24
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
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    style={{
                        width: '100%', textAlign: 'left', padding: '14px 16px',
                        background: '#f1f5f9', border: 'none', cursor: 'pointer',
                        fontWeight: 'bold', fontSize: 15
                    }}
                >
                    {showInstructions ? '▼' : '▶'} Як зібрати дані ukrshina (інструкція)
                </button>
                {showInstructions && (
                    <div style={{ padding: 16, lineHeight: 1.7, color: '#334155', fontSize: 14 }}>
                        <p><strong>1. Отримай куку Cloudflare:</strong></p>
                        <p style={{ marginLeft: 16 }}>
                            Відкрий <code>ukrshina.com.ua/uk/shiny</code> у браузері, дочекайся завантаження товарів.
                            Натисни F12 → вкладка Application → Cookies → знайди <code>cf_clearance</code>, скопіюй значення.
                            Там же візьми свій User-Agent (whatismybrowser.com).
                        </p>
                        <p><strong>2. Онови парсер:</strong></p>
                        <p style={{ marginLeft: 16 }}>
                            У файлі <code>ukrshina_cffi.py</code> встав свіжу <code>CF_CLEARANCE</code> та <code>USER_AGENT</code>.
                            Встанови кількість сторінок <code>PAGES_TO_PARSE</code> (0 = всі).
                        </p>
                        <p><strong>3. Запусти локально:</strong></p>
                        <p style={{ marginLeft: 16 }}>
                            <code>python ukrshina_cffi.py</code> — створиться файл <code>ukrshina_tires_*.xlsx</code>.
                        </p>
                        <p><strong>4. Завантаж файл сюди</strong> кнопкою вище.</p>
                        <p style={{ color: '#94a3b8', marginTop: 12 }}>
                            Кука живе кілька годин і прив'язана до IP — парсити треба з того ж комп'ютера, де отримана кука.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const statCard = { display: 'flex', flexDirection: 'column', padding: '14px 22px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 140 };
const statNum = { fontSize: 22, fontWeight: 'bold' };
const statLbl = { fontSize: 12, color: '#64748b', marginTop: 4 };

export default UkrshinaPage;

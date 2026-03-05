import axios from 'axios';

const API_BASE_URL = 'https://tire-parser-production.up.railway.app';

const apiClient = axios.create({ 
    baseURL: API_BASE_URL,
    timeout: 30000
});

// ── AUTH (заглушка) ───────────────────────────────────────────────────────────
export const authAPI = {
    login: async (email, password) => ({
        access_token: "mock-token",
        user: { id: 1, email, role: "admin", status: "approved" }
    }),
    register: async (email, password, role = 'guest') => ({ message: "Registered successfully" }),
    getCurrentUser: async () => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    }
};

// ── SHARED CACHE ──────────────────────────────────────────────────────────────
let tiresCache = null;
const getAllTiresRaw = async () => {
    if (tiresCache) return tiresCache;
    const response = await apiClient.get('/get_tires');
    tiresCache = response.data.tires || [];
    return tiresCache;
};

// ── BRANDS ────────────────────────────────────────────────────────────────────
export const fetchBrands = async () => {
    const response = await apiClient.get('/get_all_brands');
    const brands = (response.data.brands || []).map(b => ({
        brand_name: b.name,
        brand_html_id: b.brand_html_id
    }));
    return { brands };
};

// ── TIRE ATTRIBUTES ───────────────────────────────────────────────────────────
export const fetchTireWidths = async () => {
    const tires = await getAllTiresRaw();
    const widths = [...new Set(tires.map(t => t[4]).filter(Boolean))].sort();
    return { widths: widths.map(w => ({ width: w })) };
};

export const fetchTireProfils = async () => {
    const tires = await getAllTiresRaw();
    const profils = [...new Set(tires.map(t => t[5]).filter(Boolean))].sort();
    return { profils: profils.map(p => ({ profil: p })) };
};

export const fetchTireDiametrs = async () => {
    const tires = await getAllTiresRaw();
    const diametrs = [...new Set(tires.map(t => t[6]).filter(Boolean))].sort();
    return { diametrs: diametrs.map(d => ({ diametr: d })) };
};

export const fetchTireModels = async () => {
    const tires = await getAllTiresRaw();
    const models = [...new Set(tires.map(t => t[7]).filter(Boolean))].sort();
    return { models: models.map(m => ({ model: m })) };
};

// ── TIRES ─────────────────────────────────────────────────────────────────────
export const fetchTires = async (params = {}) => {
    const allTires = await getAllTiresRaw();
    let tires = allTires.map(t => ({
        tire_id: t[0], tire_name: t[1], brand_name: t[2], price: t[3],
        width: t[4], profil: t[5], diametr: t[6], model: t[7], season: t[8], link: t[9]
    }));

    if (params.brand_name?.length > 0) {
        const brands = params.brand_name.map(b => typeof b === 'object' ? b.brand_name : b);
        tires = tires.filter(t => brands.includes(t.brand_name));
    }
    if (params.seasons?.length > 0)
        tires = tires.filter(t => params.seasons.includes(t.season));
    if (params.widths?.length > 0) {
        const widths = params.widths.map(w => typeof w === 'object' ? w.width : w);
        tires = tires.filter(t => widths.includes(t.width));
    }
    if (params.profils?.length > 0) {
        const profils = params.profils.map(p => typeof p === 'object' ? p.profil : p);
        tires = tires.filter(t => profils.includes(t.profil));
    }
    if (params.diametrs?.length > 0) {
        const diametrs = params.diametrs.map(d => typeof d === 'object' ? d.diametr : d);
        tires = tires.filter(t => diametrs.includes(t.diametr));
    }
    if (params.models?.length > 0) {
        const models = params.models.map(m => typeof m === 'object' ? m.model : m);
        tires = tires.filter(t => models.includes(t.model));
    }

    if (params.sort_by) {
        tires.sort((a, b) => {
            const field = params.sort_by === 'brand' ? 'brand_name' : params.sort_by;
            if (params.sort_order === 'desc') return b[field] > a[field] ? 1 : -1;
            return a[field] > b[field] ? 1 : -1;
        });
    }

    const total = tires.length;
    const page = params.page || 1;
    const per_page = params.per_page || 20;
    const start = (page - 1) * per_page;
    return { tires: tires.slice(start, start + per_page), total, page, per_page, total_pages: Math.ceil(total / per_page) };
};

// ── SCRAPER ───────────────────────────────────────────────────────────────────
export const scrapeTires = async (url, pageCount = 1) => {
    const response = await apiClient.post('/insert_tires', { url, page_count: pageCount });
    const task_id = response.data.task_id;
    return await pollTaskStatus(task_id);
};

const pollTaskStatus = async (task_id) => {
    for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const response = await apiClient.get(`/task_status/${task_id}`);
        const status = response.data;
        if (status.status === 'completed') {
            tiresCache = null;
            return { data: status.tires || [] };
        }
        if (status.status === 'failed') throw new Error(status.error || 'Scraping failed');
    }
    throw new Error('Timeout');
};

// ── ADD TO DATABASE ───────────────────────────────────────────────────────────
export const addTiresToDatabase = async (tires) => {
    return { message: "Tires already saved during scraping" };
};

// ── PRICE HISTORY ─────────────────────────────────────────────────────────────
export const fetchTirePriceHistory = async (tireId) => {
    return { price_history: [] };
};

// ── ADMIN (заглушка) ──────────────────────────────────────────────────────────
export const adminAPI = {
    getUsers: async () => ({ users: [], total: 0 }),
    approveUser: async () => ({}),
    createBackup: async () => ({})
};

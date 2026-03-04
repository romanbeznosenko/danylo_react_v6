import axios from 'axios';

const API_BASE_URL = 'https://tire-parser-production.up.railway.app';

const apiClient = axios.create({ baseURL: API_BASE_URL });

// ── AUTH (заглушка, авторизация отключена) ───────────────────────────────────
export const authAPI = {
    login: async (email, password) => {
        return {
            access_token: "mock-token",
            user: { id: 1, email: email, role: "admin", status: "approved" }
        };
    },
    register: async (email, password, role = 'guest') => {
        return { message: "Registered successfully" };
    },
    getCurrentUser: async () => {
        const stored = localStorage.getItem('user');
        if (stored) return JSON.parse(stored);
        return null;
    }
};

// ── BRANDS ───────────────────────────────────────────────────────────────────
export const fetchBrands = async () => {
    try {
        const response = await apiClient.get('/get_all_brands');
        return response.data.brands.map(b => ({ brand_name: b.name, brand_html_id: b.brand_html_id }));
    } catch (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
};

// ── TIRES ────────────────────────────────────────────────────────────────────
export const fetchTires = async (params = {}) => {
    try {
        const response = await apiClient.get('/get_tires');
        let tires = response.data.tires.map(t => ({
            tire_id: t[0],
            tire_name: t[1],
            brand_name: t[2],
            price: t[3],
            width: t[4],
            profil: t[5],
            diametr: t[6],
            model: t[7],
            season: t[8],
            link: t[9],
        }));

        // Client-side filtering
        if (params.brand_name && params.brand_name.length > 0) {
            const brands = params.brand_name.map(b => typeof b === 'object' ? b.brand_name : b);
            tires = tires.filter(t => brands.includes(t.brand_name));
        }
        if (params.seasons && params.seasons.length > 0) {
            tires = tires.filter(t => params.seasons.includes(t.season));
        }
        if (params.widths && params.widths.length > 0) {
            const widths = params.widths.map(w => typeof w === 'object' ? w.width : w);
            tires = tires.filter(t => widths.includes(t.width));
        }
        if (params.profils && params.profils.length > 0) {
            const profils = params.profils.map(p => typeof p === 'object' ? p.profil : p);
            tires = tires.filter(t => profils.includes(t.profil));
        }
        if (params.diametrs && params.diametrs.length > 0) {
            const diametrs = params.diametrs.map(d => typeof d === 'object' ? d.diametr : d);
            tires = tires.filter(t => diametrs.includes(t.diametr));
        }
        if (params.models && params.models.length > 0) {
            const models = params.models.map(m => typeof m === 'object' ? m.model : m);
            tires = tires.filter(t => models.includes(t.model));
        }

        // Sorting
        if (params.sort_by) {
            tires.sort((a, b) => {
                const field = params.sort_by === 'brand' ? 'brand_name' : params.sort_by;
                if (params.sort_order === 'desc') return b[field] > a[field] ? 1 : -1;
                return a[field] > b[field] ? 1 : -1;
            });
        }

        // Pagination
        const total = tires.length;
        const page = params.page || 1;
        const per_page = params.per_page || 20;
        const start = (page - 1) * per_page;
        const paginated = tires.slice(start, start + per_page);

        return {
            tires: paginated,
            total,
            page,
            per_page,
            total_pages: Math.ceil(total / per_page)
        };
    } catch (error) {
        console.error('Error fetching tires:', error);
        throw error;
    }
};

// ── SCRAPER ──────────────────────────────────────────────────────────────────
export const scrapeTires = async (url, pageCount = 1) => {
    try {
        const response = await apiClient.post('/insert_tires', {
            url: url,
            page_count: pageCount
        });
        // insert_tires returns task_id, poll for completion
        const task_id = response.data.task_id;
        return await pollTaskStatus(task_id);
    } catch (error) {
        console.error('Error scraping tires:', error);
        throw error;
    }
};

const pollTaskStatus = async (task_id) => {
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const response = await apiClient.get(`/task_status/${task_id}`);
        const status = response.data;
        if (status.status === 'completed') {
            // Fetch and return the tires
            const tiresResp = await apiClient.get('/get_tires');
            const tires = tiresResp.data.tires.map(t => ({
                id: t[0], name: t[1], brand: t[2], price: t[3],
                width: t[4], profil: t[5], diametr: t[6],
                model: t[7], season: t[8], link: t[9]
            }));
            return { data: tires };
        }
        if (status.status === 'failed') {
            throw new Error(status.error || 'Scraping failed');
        }
    }
    throw new Error('Timeout waiting for scraper');
};

// ── ADD TIRES TO DATABASE ────────────────────────────────────────────────────
export const addTiresToDatabase = async (tires) => {
    // Tires already inserted during scraping, just return success
    return { message: "Tires already saved during scraping" };
};

// ── TIRE ATTRIBUTES (client-side from all tires) ─────────────────────────────
export const fetchTireWidths = async () => {
    const response = await apiClient.get('/get_tires');
    const widths = [...new Set(response.data.tires.map(t => t[4]).filter(Boolean))].sort();
    return widths.map(w => ({ width: w }));
};

export const fetchTireProfils = async () => {
    const response = await apiClient.get('/get_tires');
    const profils = [...new Set(response.data.tires.map(t => t[5]).filter(Boolean))].sort();
    return profils.map(p => ({ profil: p }));
};

export const fetchTireDiametrs = async () => {
    const response = await apiClient.get('/get_tires');
    const diametrs = [...new Set(response.data.tires.map(t => t[6]).filter(Boolean))].sort();
    return diametrs.map(d => ({ diametr: d }));
};

export const fetchTireModels = async () => {
    const response = await apiClient.get('/get_tires');
    const models = [...new Set(response.data.tires.map(t => t[7]).filter(Boolean))].sort();
    return models.map(m => ({ model: m }));
};

export const fetchTirePriceHistory = async (tireId) => {
    return { price_history: [] };
};

export const adminAPI = {
    getUsers: async () => ({ users: [], total: 0 }),
    approveUser: async () => ({}),
    createBackup: async () => ({})
};

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors (token expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authApi = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    me: () => api.get('/auth/me'),
};

// Generic CRUD for any resource
export function createResourceApi(resource: string) {
    return {
        list: () => api.get(`/${resource}`),
        get: (id: number) => api.get(`/${resource}/${id}`),
        create: (data: Record<string, unknown>) => api.post(`/${resource}`, data),
        update: (id: number, data: Record<string, unknown>) => api.put(`/${resource}/${id}`, data),
        remove: (id: number) => api.delete(`/${resource}/${id}`),
        bulkDelete: (ids: number[]) => api.post(`/${resource}/bulk-delete`, { ids }),
        sync: (data: Record<string, unknown>[]) => api.post(`/${resource}/sync`, { data, confirm: true }),
        batchImport: (data: Record<string, unknown>[]) => api.post(`/${resource}/import`, { data }),
    };
}

// Pre-built resource APIs
export const arrivalsApi = createResourceApi('arrivals');
export const transactionsApi = createResourceApi('transactions');
export const vasApi = createResourceApi('vas');
export const dccApi = createResourceApi('dcc');
export const damagesApi = createResourceApi('damages');
export const sohApi = createResourceApi('soh');
export const qcReturnsApi = createResourceApi('qc-returns');
export const locationsApi = createResourceApi('locations');
export const attendancesApi = createResourceApi('attendances');
export const employeesApi = createResourceApi('employees');
export const productivityApi = createResourceApi('project-productivities');
export const unloadingsApi = createResourceApi('unloadings');
export const schedulesApi = createResourceApi('schedules');
export const beritaAcaraApi = createResourceApi('berita-acara');
export const stockOpnamesApi = createResourceApi('stock-opnames');
export const additionalMpApi = createResourceApi('additional-mp');
export const masterItemsApi = createResourceApi('master-items');
export const inboundRejectionsApi = createResourceApi('inbound-rejections');
export const inboundCasesApi = createResourceApi('inbound-cases');

// User management API (custom endpoints)
export const usersApi = {
    list: () => api.get('/users'),
    create: (data: { username: string; password: string; role: string }) => api.post('/users', data),
    changePassword: (id: number, data: { current_password?: string; new_password: string }) => api.put(`/users/${id}/password`, data),
    changeRole: (id: number, role: string) => api.put(`/users/${id}/role`, { role }),
    remove: (id: number) => api.delete(`/users/${id}`),
};

// Public API (no auth required) for Key Account pages
const publicAxios = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});
export const publicApi = {
    sohList: () => publicAxios.get('/public/soh'),
    locationsList: () => publicAxios.get('/public/locations'),
};

export default api;

/**
 * Единый HTTP-клиент для всех сервисов
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };

        try {
            const res = await fetch(url, config);

            // Проверка на JSON
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                return { ok: false, error: 'Invalid response format', details: text };
            }

            const data = await res.json();

            // Если бэкенд возвращает { ok: true/false, ... }
            if (typeof data === 'object' && data !== null) {
                return data;
            }

            return { ok: true, data }; // На случай, если просто данные
        } catch (err) {
            return { ok: false, error: err.message || 'Network error' };
        }
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

export const api = new ApiService();
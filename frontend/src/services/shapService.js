import { api } from '../api/api';

export const shapService = {
    async getShap(smiles) {
        const result = await api.post('/api/predictShap', { smiles });

        // Унифицируем ответ: если ok, возвращаем { ok: true, data: ... }
        if (result.ok && result.data !== undefined) {
            return { ok: true, data: result.data };
        }
        if (result.ok) {
            return { ok: true, data: result };
        }
        return { ok: false, error: result.error || 'SHAP prediction failed' };
    },
};
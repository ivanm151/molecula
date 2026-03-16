export const shapService = {
    async getShap(smiles) {
        try {
            const res = await fetch('/api/predictShap', { // ❌ Было: /predict_shap → ✅ Стало: /predictShap
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ smiles }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('[SHAP Service] Ошибка ответа:', res.status, errorText);
                return { ok: false, error: `HTTP ${res.status}` };
            }

            const parsed = await res.json();
            // If backend returned { ok: true, data: {...} }, unwrap it.
            if (parsed && typeof parsed === 'object') {
                if (parsed.ok === true && parsed.data !== undefined) {
                    return { ok: true, data: parsed.data };
                }
                return { ok: true, data: parsed };
            }
            return { ok: false, error: 'Invalid JSON from SHAP service' };
        } catch (err) {
            console.error('[SHAP Service] Ошибка сети:', err);
            return { ok: false, error: err.message || 'Network error' };
        }
    },
};
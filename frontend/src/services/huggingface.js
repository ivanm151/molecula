/**
 * Сервис для работы с Hugging Face API
 */
export const hfService = {
    /**
     * Анализирует SMILES: возвращает свойства молекулы
     * @param {string} smiles
     * @returns {Promise<{ ok: boolean, data?: Molecule, error?: string }>}
     */
    async analyze(smiles) {
        try {
            const res = await fetch('/api/hf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ smiles }),
            });

            const result = await res.json();
            return result;
        } catch (err) {
            console.error('[HF Service] Ошибка анализа:', err);
            return { ok: false, error: err.message || 'Network error' };
        }
    },

    /**
     * Получает название молекулы по SMILES
     * @param {string} smiles
     * @returns {Promise<{ ok: boolean, name?: string, error?: string }>}
     */
    async getName(smiles) {
        try {
            const res = await fetch('/api/getName', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ smiles }),
            });

            const result = await res.json();
            return result;
        } catch (err) {
            console.error('[HF Service] Ошибка получения имени:', err);
            return { ok: false, error: err.message || 'Network error' };
        }
    },
};
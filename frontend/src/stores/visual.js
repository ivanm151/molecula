import { defineStore } from 'pinia';
import { shapService } from '../services/shapService.js';

export const useShapStore = defineStore('shap', {
    state: () => ({
        data: null,           // Полный ответ: { solubility, logp, ct_tox, ... }
        loading: false,       // Флаг загрузки
        error: null,          // Ошибка, если была
        lastSmiles: null,     // Для кэширования: не грузить повторно
    }),

    getters: {
        // Получить SHAP для конкретного свойства
        shapFor: (state) => (property) => {
            if (!state.data) return null;
            const map = {
                solubility: 'solubility',
                logp: 'logp',
                ct_tox: 'cardiotoxicity',
                fda_approved: 'fdaapprov',
                p_np: 'clintox',
            };
            const key = map[property];
            return state.data[key] || null;
        },

        // Получить все atom_shap массивы
        allAtomShap: (state) => {
            if (!state.data) return {};
            return {
                solubility: state.data.solubility?.atom_shap || [],
                logp: state.data.logp?.atom_shap || [],
                ct_tox: state.data.cardiotoxicity?.atom_shap || [],
                fda_approved: state.data.fdaapprov?.atom_shap || [],
                p_np: state.data.clintox?.atom_shap || [],
            };
        },
    },

    actions: {
        // Загрузить SHAP-данные
        async loadShap(smiles) {
            const s = smiles.trim();
            if (!s) {
                this.error = 'SMILES не задан';
                return { ok: false, error: 'SMILES не задан' };
            }

            // Не загружаем повторно
            if (this.lastSmiles === s && this.data) {
                return { ok: true, data: this.data };
            }

            this.loading = true;
            this.error = null;
            this.data = null;

            try {
                const result = await shapService.getShap(s);

                if (result.ok) {
                    this.data = result.data;
                    this.lastSmiles = s;
                    return { ok: true, data: result.data };
                } else {
                    this.error = result.error;
                    return result;
                }
            } catch (err) {
                this.error = err.message;
                return { ok: false, error: err.message };
            } finally {
                this.loading = false;
            }
        },

        // Очистить данные
        clear() {
            this.data = null;
            this.lastSmiles = null;
            this.error = null;
        },
    },
});
import { defineStore } from "pinia";
import { dbService } from "../services/dbService.js";
import { hfService } from "../services/hfService.js";

export const useMoleculeStore = defineStore("molecule", {
    state: () => ({
        molecules: [],
        loading: false,
        error: null,
    }),

    getters: {
        approvedMolecules: (state) => state.molecules.filter((m) => m.fda_approved),
        toxicMolecules: (state) => state.molecules.filter((m) => m.ct_tox > 0.5),
        count: (state) => state.molecules.length,
    },

    actions: {
        async loadMolecules() {
            this.loading = true;
            this.error = null;

            try {
                const result = await dbService.getMolecules();
                if (result.ok) {
                    this.molecules = result.data;
                } else {
                    this.error = result.error;
                }
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        // ✅ Новый метод: анализ без сохранения — для предпросмотра
        async analyzeMolecule(smiles) {
            this.error = null;

            try {
                // Проверка: есть ли уже?
                const existing = this.molecules.find(m => m.smiles === smiles);
                if (existing) {
                    return {
                        ok: true,
                        exists: true,
                        data: {
                            name: existing.name,
                            smiles: existing.smiles,
                            solubility: existing.solubility,
                            logp: existing.lipophilicity,
                            cardiotoxicity: existing.ct_tox,
                            fdaapprov: existing.fda_approved ? 1 : 0,
                            clintox: existing.p_np,
                        }
                    };
                }

                // Получаем имя
                const nameResult = await hfService.getName(smiles);
                if (!nameResult.ok) throw new Error(nameResult.error);

                // Получаем свойства
                const analysis = await hfService.analyze(smiles);
                if (!analysis.ok) throw new Error(analysis.error);

                // Возвращаем полный объект с правильными именами
                return {
                    ok: true,
                    exists: false,
                    data: {
                        name: nameResult.name,
                        smiles,
                        solubility: analysis.data.solubility,
                        logp: analysis.data.lipophilicity,
                        cardiotoxicity: analysis.data.ct_tox,
                        fdaapprov: analysis.data.fda_approved ? 1 : 0,
                        clintox: analysis.data.p_np,
                    }
                };
            } catch (err) {
                this.error = err.message;
                return { ok: false, error: err.message };
            }
        },

        // ✅ Сохранение — уже с анализом
        async addMolecule(smiles) {
            this.error = null;

            // Используем анализ из стора
            const preview = await this.analyzeMolecule(smiles);
            if (!preview.ok || preview.exists) {
                return preview;
            }

            // Отправляем на сервер
            const result = await dbService.addMolecule(smiles);

            if (result.ok && !result.exists) {
                // Убедимся, что имя есть
                result.data.name = result.data.name || preview.data.name;
                this.molecules.unshift(result.data);
                return { ok: true, exists: false, data: result.data };
            } else if (result.exists) {
                return { ok: true, exists: true, data: result.data };
            } else {
                this.error = result.error;
                return { ok: false, error: result.error };
            }
        },
    },
});
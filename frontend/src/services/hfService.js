import { api } from '../api/api';

export const hfService = {
    async analyze(smiles) {
        return api.post('/api/hf', { smiles });
    },

    async getName(smiles) {
        return api.post('/api/getName', { smiles });
    },
};
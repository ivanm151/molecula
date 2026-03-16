import { api } from '../api/api';

export const dbService = {
    async getMolecules() {
        return api.get('/api/db');
    },

    async addMolecule(smiles) {
        return api.post('/api/addMolecule', { smiles });
    },
};
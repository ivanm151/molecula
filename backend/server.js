require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Клиенты
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const HF_SPACE_URL = process.env.HF_SPACE_URL;

// Middleware
app.use(cors());
app.use(express.json());

// ---------- Валидация SMILES ----------
async function validateSmiles(smiles) {
    try {
        await axios.post(`${HF_SPACE_URL}/api/descriptor`, { smiles });
        return true;
    } catch (err) {
        console.error('[Validation] Ошибка при валидации SMILES:', err.response?.data || err.message);
        return false;
    }
}

// ---------- HuggingFace: Анализ молекулы (solubility, logp и т.д.) ----------
app.post('/api/hf', async (req, res) => {
    const { smiles } = req.body;

    if (!smiles || typeof smiles !== 'string') {
        return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
    }

    try {
        const valid = await validateSmiles(smiles);
        if (!valid) {
            return res.status(400).json({ ok: false, error: 'Невалидный SMILES' });
        }

        const { data: prediction } = await axios.post(`${HF_SPACE_URL}/api/predict`, { smiles });

        const moleculeData = {
            smiles,
            solubility: prediction.solubility,
            lipophilicity: prediction.logp,
            ct_tox: prediction.cardiotoxicity,
            fda_approved: prediction.fdaapprov === 1,
            p_np: prediction.clintox,
        };

        res.json({ ok: true, data: moleculeData });
    } catch (err) {
        console.error('Ошибка в /api/hf:', err.response?.data || err.message);
        res.status(500).json({ ok: false, error: 'Ошибка при анализе молекулы' });
    }
});

// ---------- Получение молекул из Supabase ----------
app.get('/api/db', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('molecules')
            .select('id, smiles, solubility, lipophilicity, ct_tox, fda_approved, p_np, name')
            .order('id', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ ok: true, data });
    } catch (err) {
        console.error('Ошибка при получении данных:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ---------- Добавление молекулы ----------
app.post('/api/addMolecule', async (req, res) => {
    const { smiles } = req.body;

    if (!smiles || typeof smiles !== 'string') {
        return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
    }

    try {
        const valid = await validateSmiles(smiles);
        if (!valid) {
            return res.status(400).json({ ok: false, error: 'Невалидный SMILES' });
        }

        const { data: prediction } = await axios.post(`${HF_SPACE_URL}/api/predict`, { smiles });

        let name = null;
        try {
            const { data: nameData } = await axios.post(`${HF_SPACE_URL}/api/get_name`, { smiles });
            name = nameData.name || null;
        } catch (err) {
            console.warn('Не удалось получить имя:', err.response?.data || err.message);
        }

        const moleculeData = {
            smiles,
            solubility: prediction.solubility,
            lipophilicity: prediction.logp,
            ct_tox: prediction.cardiotoxicity,
            fda_approved: prediction.fdaapprov === 1,
            p_np: prediction.clintox,
            name,
        };

        const { data, error } = await supabase
            .from('molecules')
            .insert([moleculeData])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.json({ ok: true, exists: true });
            }
            throw error;
        }

        res.json({ ok: true, exists: false, data });
    } catch (err) {
        console.error('Ошибка при добавлении молекулы:', err.response?.data || err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ---------- Получение названия молекулы ----------
app.post('/api/getName', async (req, res) => {
    const { smiles } = req.body;

    if (!smiles || typeof smiles !== 'string') {
        return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
    }

    try {
        const { data } = await axios.post(`${HF_SPACE_URL}/api/get_name`, { smiles });
        res.json({ ok: true, name: data.name });
    } catch (err) {
        console.error('Ошибка при получении имени:', err.response?.data || err.message);
        res.status(500).json({ ok: false, error: 'Не удалось получить название' });
    }
});

// ---------- Получение SHAP-объяснения ----------
app.post('/api/predictShap', async (req, res) => {
    const { smiles } = req.body;

    if (!smiles || typeof smiles !== 'string') {
        return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
    }

    try {
        const { data } = await axios.post(`${HF_SPACE_URL}/api/predict_shap`, { smiles });
        res.json({ ok: true, data });
    } catch (err) {
        console.error('Ошибка при обращении к /api/predict_shap:', err.response?.data || err.message);
        res.status(500).json({ ok: false, error: 'Ошибка в SHAP-модели' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
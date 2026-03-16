require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
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
        const res = await fetch(`${HF_SPACE_URL}/api/descriptor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });
        return res.ok;
    } catch (err) {
        console.error('[Validation] Ошибка при валидации SMILES:', err.message);
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

        const predictRes = await fetch(`${HF_SPACE_URL}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });

        if (!predictRes.ok) {
            return res.status(500).json({ ok: false, error: 'Ошибка при анализе молекулы' });
        }

        const prediction = await predictRes.json();

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
        console.error('Ошибка в /api/hf:', err);
        res.status(500).json({ ok: false, error: 'Network error' });
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

        const predictRes = await fetch(`${HF_SPACE_URL}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });
        if (!predictRes.ok) {
            return res.status(500).json({ ok: false, error: 'Ошибка при анализе молекулы' });
        }
        const prediction = await predictRes.json();

        const nameRes = await fetch(`${HF_SPACE_URL}/api/get_name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });
        const nameData = await nameRes.json().catch(() => null);
        const name = nameData?.name || null;

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
                return res.json({ ok: true, exists: true }); // Уже существует
            }
            throw error;
        }

        res.json({ ok: true, exists: false, data });
    } catch (err) {
        console.error('Ошибка при добавлении молекулы:', err);
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
        const res = await fetch(`${HF_SPACE_URL}/api/get_name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });

        if (!res.ok) {
            return res.status(400).json({ ok: false, error: 'Не удалось получить название' });
        }

        const data = await res.json();
        res.json({ ok: true, name: data.name });
    } catch (err) {
        console.error('Ошибка при получении имени:', err);
        res.status(500).json({ ok: false, error: 'Network error' });
    }
});

// ---------- Получение SHAP-объяснения ----------
app.post('/api/predictShap', async (req, res) => {
    const { smiles } = req.body;

    if (!smiles || typeof smiles !== 'string') {
        return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
    }

    try {
        const response = await fetch(`${HF_SPACE_URL}/api/predict_shap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('SHAP API error:', text);
            return res.status(500).json({ ok: false, error: 'Ошибка в SHAP-модели' });
        }

        const data = await response.json();
        res.json({ ok: true, data });
    } catch (err) {
        console.error('Ошибка при обращении к /api/predict_shap:', err);
        res.status(500).json({ ok: false, error: 'Network error' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
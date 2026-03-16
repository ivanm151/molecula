import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

// ---------- СЕКРЕТЫ ----------
const SUPABASE_URL = defineSecret("SUPABASE_URL");
const SUPABASE_KEY = defineSecret("SUPABASE_KEY");
const HF_TOKEN = defineSecret("HF_TOKEN");

// ---------- Supabase клиент ----------
function getSupabaseClient() {
    return createClient(SUPABASE_URL.value(), SUPABASE_KEY.value());
}

// ---------- HuggingFace API: Predict + Validate via Descriptor ----------
export const hf = onRequest(
    { secrets: [HF_TOKEN] },
    async (req, res) => {
        const { smiles } = req.body;

        if (!smiles || typeof smiles !== 'string') {
            return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
        }

        try {
            // Шаг 1: Проверка валидности SMILES через /api/descriptor
            const validateRes = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/descriptor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });

            if (!validateRes.ok) {
                const errText = await validateRes.text();
                return res.status(400).json({ ok: false, error: 'Невалидный SMILES' });
            }

            // Шаг 2: Получаем предикт через /api/predict
            const predictRes = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });

            if (!predictRes.ok) {
                return res.status(500).json({ ok: false, error: 'Ошибка при анализе молекулы' });
            }

            const prediction = await predictRes.json(); // предикт который Максим может использовать в своих сервисах

            // Подготавливаем данные для сохранения
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
            console.error('Ошибка при обращении к Hugging Face:', err);
            res.status(500).json({ ok: false, error: 'Network error' });
        }
    }
);
// ---------- Supabase API: Получение молекул ----------
export const db = onRequest(
    { secrets: [SUPABASE_URL, SUPABASE_KEY] },
    async (req, res) => {
        try {
            const supabase = getSupabaseClient();

            const { data, error } = await supabase
                .from("molecules")
                .select("id, smiles, solubility, lipophilicity, ct_tox, fda_approved, p_np, name")
                .order("id", { ascending: false })
                .limit(50);

            if (error) throw error;

            res.json({ ok: true, data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export const addMolecule = onRequest(
    { secrets: [SUPABASE_URL, SUPABASE_KEY] },
    async (req, res) => {
        const { smiles } = req.body;

        if (!smiles || typeof smiles !== 'string') {
            return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
        }

        try {
            const supabase = getSupabaseClient();

            // 1. Валидация SMILES
            const validateRes = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/descriptor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });
            if (!validateRes.ok) return res.status(400).json({ ok: false, error: 'Невалидный SMILES' });

            // 2. Получаем предикт
            const predictRes = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });
            if (!predictRes.ok) return res.status(500).json({ ok: false, error: 'Ошибка при анализе молекулы' });

            const prediction = await predictRes.json();

            // 3. Получаем название
            const nameRes = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/get_name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });
            const nameData = await nameRes.json().catch(() => null);
            const name = nameData?.name || null;

            // 4. Подготавливаем молекулу
            const moleculeData = {
                smiles,
                solubility: prediction.solubility,
                lipophilicity: prediction.logp,
                ct_tox: prediction.cardiotoxicity,
                fda_approved: prediction.fdaapprov === 1,
                p_np: prediction.clintox,
                name, // <-- новое поле
            };

            // 5. Вставка
            const { data, error } = await supabase
                .from('molecules')
                .insert([moleculeData])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') return res.json({ ok: true, exists: true });
                throw error;
            }

            res.json({ ok: true, exists: false, data });
        } catch (err) {
            console.error('Ошибка при добавлении молекулы:', err);
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

// ---------- HuggingFace API: Получение названия молекулы ----------
export const getName = onRequest(
    { secrets: [HF_TOKEN] }, // не обязателен, если API публичный
    async (req, res) => {
        const { smiles } = req.body;

        if (!smiles || typeof smiles !== 'string') {
            return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
        }

        try {
            const response = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/get_name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles }),
            });

            if (!response.ok) {
                return res.status(400).json({ ok: false, error: 'Не удалось получить название' });
            }

            const data = await response.json();
            res.json({ ok: true, name: data.name });
        } catch (err) {
            console.error('Ошибка при получении имени:', err);
            res.status(500).json({ ok: false, error: 'Network error' });
        }
    }
);

// ---------- HuggingFace API: Predict SHAP ----------
export const predictShap = onRequest(
    { secrets: [HF_TOKEN] },
    async (req, res) => {
        const { smiles } = req.body;

        if (!smiles || typeof smiles !== 'string') {
            return res.status(400).json({ ok: false, error: 'Поле smiles обязательно' });
        }

        try {
            const response = await fetch('https://pablodrev-molecular-features-prediction.hf.space/api/predict_shap', {
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
    }
);
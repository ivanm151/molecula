<template>
  <div class="test-view">
    <Header />

    <h1>Молекулярный анализ</h1>

    <div class="layout">
      <!-- Левый блок: визуализация -->
      <div class="visualization">
        <div class="viewer-2d">
          <h2>2D Viewer</h2>
          <Molecule2DViewer
              ref="moleculeViewerRef"
              :smiles="smiles"
              :renderTrigger="renderTrigger"
          />
          <div class="viewer-buttons">
            <button
                v-for="feature in featureList"
                :key="feature.key"
                @click="applyHeatmap(feature.key)"
            >
              {{ feature.label }}
            </button>
            <button @click="clearHeatmap">Очистить тепловую карту</button>
            <!-- Тепловая карта -->
            <div class="heatmap-label">
              Тепловая карта показывает влияние каждого атома на выбранное свойство:
              <span class="high-impact">оранжевые</span> — повышают,
              <span class="low-impact">зелёные</span> — понижают
            </div>
          </div>
        </div>

        <div class="viewer-3d">
          <h2>3D Viewer</h2>
          <Molecule3DViewer
              :smiles="smiles"
              :renderTrigger="renderTrigger"
          />
        </div>
      </div>

      <!-- Правый блок: анализ -->
      <div class="analysis-block">
        <p>Введите SMILES-нотацию молекулы</p>
        <div class="input-group">
          <input
              v-model="smiles"
              type="text"
              placeholder="Например: C1=CC=CC=C1"
              :disabled="loading || saving"
              @keyup.enter="analyzeMolecule"
          />
          <button @click="analyzeMolecule" :disabled="loading || saving">
            {{ loading ? 'Анализ...' : 'Анализировать' }}
          </button>
        </div>

        <div v-if="message" class="message" :class="messageType">
          {{ message }}
        </div>

        <div v-if="prediction" class="result-card">
          <h2>Результаты анализа</h2>
          <ul class="prediction-list">
            <li><strong>SMILES:</strong> {{ prediction.smiles }}</li>
            <li><strong>Название:</strong> {{ prediction.name || '—' }}</li>
            <li><strong>Растворимость:</strong> {{ prediction.solubility?.toFixed(4) }}</li>
            <li><strong>Липофильность (logP):</strong> {{ prediction.logp?.toFixed(4) }}</li>
            <li><strong>Кардиотоксичность:</strong> {{ prediction.cardiotoxicity?.toFixed(4) }}</li>
            <li><strong>FDA одобрение:</strong> {{ prediction.fdaapprov ? 'Да' : 'Нет' }}</li>
            <!-- ✅ CLINTOX как Да/Нет -->
            <li><strong>CLINTOX:</strong> {{ clintoxDisplay }}</li>
          </ul>
          <button @click="saveToDB" :disabled="saving">
            {{ saving ? 'Сохранение...' : 'Сохранить в БД' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Header from '../components/layout/Header.vue';
import Molecule2DViewer from '../components/ui/Molecule2DViewer.vue';
import Molecule3DViewer from '../components/ui/Molecule3DViewer.vue';
import { useMoleculeStore } from '../stores/molecula';

const store = useMoleculeStore();

const smiles = ref('C1=CC=CC=C1');
const renderTrigger = ref(0);
const moleculeViewerRef = ref(null);
const loading = ref(false);
const saving = ref(false);
const message = ref('');
const messageType = ref('');
const prediction = ref(null);

const featureList = [
  { key: 'solubility', label: 'Растворимость' },
  { key: 'logp', label: 'Липофильность (logP)' },
  { key: 'cardiotoxicity', label: 'Кардиотоксичность' },
  { key: 'fdaapprov', label: 'FDA одобрение' },
  { key: 'clintox', label: 'Токсичность' }
];

const shapData = {
  solubility: [0.2, -0.1, 0.05, 0.0, -0.2, 0.1],
  logp: [-0.1, 0.2, -0.05, 0.1, 0.0, -0.2],
  cardiotoxicity: [0.3, -0.3, 0.1, -0.1, 0.2, -0.2],
  fdaapprov: [-0.2, 0.2, -0.1, 0.1, 0.0, 0.0],
  clintox: [0.1, -0.1, 0.2, -0.2, 0.1, -0.1]
};

// ✅ Вычисляемое значение для отображения
const clintoxDisplay = computed(() => {
  if (!prediction.value) return '—';
  return prediction.value.clintox > 0.5 ? 'Да' : 'Нет';
});

const renderViewers = () => {
  renderTrigger.value++;
  moleculeViewerRef.value?.clearAtomHeatmap();
};

const applyHeatmap = (featureKey) => {
  const atomShap = shapData[featureKey];
  moleculeViewerRef.value?.setAtomHeatmap(atomShap);
};

const clearHeatmap = () => {
  moleculeViewerRef.value?.clearAtomHeatmap();
};

const setMessage = (text, type = 'error') => {
  message.value = text;
  messageType.value = type;
};

const clearMessage = () => {
  message.value = '';
  messageType.value = '';
};

const analyzeMolecule = async () => {
  const s = smiles.value.trim();
  if (!s) return setMessage('Введите SMILES', 'error');

  loading.value = true;
  clearMessage();
  prediction.value = null;

  try {
    const result = await store.analyzeMolecule(s);
    if (result.ok) {
      setMessage(result.exists ? 'Молекула уже существует в базе' : 'Анализ завершён', 'success');
      prediction.value = result.data;
      renderViewers();
    } else {
      setMessage('Ошибка анализа: ' + result.error, 'error');
    }
  } catch (err) {
    setMessage('Ошибка: ' + err.message, 'error');
  } finally {
    loading.value = false;
  }
};

const saveToDB = async () => {
  if (!prediction.value) return;

  saving.value = true;
  clearMessage();

  try {
    const result = await store.addMolecule(smiles.value.trim());

    if (result.ok) {
      setMessage(result.exists ? 'Молекула уже в базе' : 'Молекула успешно добавлена!', 'success');
      if (!result.exists) {
        smiles.value = '';
        prediction.value = null;
      }
    } else {
      setMessage('Ошибка при сохранении: ' + result.error, 'error');
    }
  } catch (err) {
    setMessage('Ошибка сети: ' + err.message, 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use '../assets/styles/components/ui/TestView.scss';
</style>
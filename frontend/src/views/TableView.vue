<script setup>
import { onMounted } from 'vue';
import { useMoleculeStore } from '../stores/molecula';
import * as XLSX from 'xlsx';
import Header from '../components/layout/Header.vue';

const store = useMoleculeStore();

onMounted(() => {
  store.loadMolecules();
});

const clintoxLabel = (value) => {
  if (value == null) return '—';
  return value > 0.5 ? '✅' : '❌';
};

const exportLabel = (value) => {
  return value > 0.5 ? 'Да' : 'Нет';
};

const exportToExcel = () => {
  if (!store.molecules.length) {
    alert('Нет данных для экспорта');
    return;
  }

  const worksheetData = [
    ['ID', 'Название', 'SMILES', 'Растворимость', 'Липофильность', 'Токсичность', 'FDA', 'CLINTOX'],
    ...store.molecules.map(mol => [
      mol.id,
      mol.name || '—',
      mol.smiles,
      mol.solubility?.toFixed(3),
      mol.lipophilicity?.toFixed(3),
      mol.ct_tox?.toFixed(3),
      mol.fda_approved ? 'Да' : 'Нет',
      exportLabel(mol.p_np)
    ])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = [
    { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Молекулы');
  XLSX.writeFile(workbook, 'отчет_молекулы.xlsx');
};
</script>

<template>
  <div class="table-view">
    <Header />
    <main class="table-view-main">
      <h1 class="table-view-title">История анализа</h1>

      <nav class="table-view-toolbar">

        <button class="table-view-export-btn" @click="exportToExcel" :disabled="store.loading">
          Экспорт в Excel
        </button>
      </nav>

      <div v-if="store.loading" class="table-view-status loading">
        Загрузка молекул...
      </div>

      <div v-else-if="store.error" class="table-view-status error">
        Ошибка: {{ store.error }}
      </div>

      <div v-else-if="store.molecules.length === 0" class="table-view-status empty">
        Нет сохранённых молекул. Перейдите на главную и проанализируйте хотя бы одну.
      </div>

      <div v-else class="table-view-wrapper">
        <table class="table-view-table">
          <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>SMILES</th>
            <th>Растворимость</th>
            <th>Липофильность</th>
            <th>Токсичность</th>
            <th>FDA</th>
            <th>CLINTOX</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="mol in store.molecules" :key="mol.id">
            <td>{{ mol.id }}</td>
            <td>{{ mol.name || '—' }}</td>
            <td class="mono-cell"><code>{{ mol.smiles }}</code></td>
            <td>{{ mol.solubility?.toFixed(3) }}</td>
            <td>{{ mol.lipophilicity?.toFixed(3) }}</td>
            <td :class="['value', { high: mol.ct_tox > 0.5 }]">{{ mol.ct_tox?.toFixed(3) }}</td>
            <td :class="['status-cell', mol.fda_approved ? 'success' : 'danger']">
              {{ mol.fda_approved ? 'Да' : 'Нет' }}
            </td>
            <td :class="['status-cell', mol.p_np > 0.5 ? 'success' : 'danger']">
              {{ mol.p_np > 0.5 ? 'Да' : 'Нет' }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/styles/components/ui/TableView.scss';
</style>
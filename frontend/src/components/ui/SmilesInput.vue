<template>
  <div>
    <input v-model="localValue" placeholder="Paste SMILES here" />
    <button @click="submit">Load Molecule</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: String
});
const emit = defineEmits(['update:modelValue', 'smiles-submit']);

const localValue = ref(props.modelValue || '');
const error = ref(null);

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v || '';
  }
);

watch(localValue, (v) => {
  emit('update:modelValue', v);
});

function submit() {
  if (!localValue.value) {
    error.value = 'Please enter a SMILES string';
    return;
  }
  error.value = null;
  emit('smiles-submit', localValue.value);
}
</script>

<style scoped lang="scss">
@use '../../assets/styles/components/ui/smilesinput';
</style>
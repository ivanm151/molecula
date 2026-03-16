<template>
  <div class="smiles-display">
    <strong>SMILES:</strong>
    <span class="smiles-text">{{ smiles }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  smiles: {
    type: String,
    default: ''
  }
});
</script>

<style scoped lang="scss">
@use '../../assets/styles/components/ui/smilesdisplay';
</style>
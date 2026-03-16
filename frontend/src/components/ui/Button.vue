<template>
  <button @click="animate = true" @animationend="animate = false">
    <i :class="['fa-solid fa-heart', { bounce: animate }]"></i>
  </button>
</template>

<script setup>
import { ref } from 'vue'
const animate = ref(false)
</script>

<style scoped lang="scss">
@use '../../assets/styles/components/ui/button';
</style>
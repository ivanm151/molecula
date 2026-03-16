<script setup>
import { ref } from 'vue';

const isMenuOpen = ref(false);

// Для закрытия меню при выборе пункта (на мобильных)
const closeMenu = () => {
  isMenuOpen.value = false;
};
</script>

<template>
  <header class="header">
    <div class="header-container">
      <!-- Логотип -->
      <a href="/" class="logo-link" @click="closeMenu">
        <span class="logo-text">MoleMap</span>
      </a>

      <!-- Навигация с инлайн-стилями -->
      <nav class="nav">
        <router-link
            to="/test"
            class="nav-link"
            @click="closeMenu"
            :style="{ color: 'black', padding: '8px 160px', 'font-weight': '500' }"
        >
          Главная
        </router-link>
        <router-link
            to="/table"
            class="nav-link"
            @click="closeMenu"
            :style="{ color: 'black', padding: '8px 16px', 'font-weight': '500' }"
        >
          История
        </router-link>
      </nav>

    </div>
  </header>
</template>

<style scoped lang="scss">
@use '../../assets/styles/components/layout/header';
</style>
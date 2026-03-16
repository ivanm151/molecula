<script setup>
import { ref } from 'vue';
import logoImg from '../../assets/styles/sfu/SFU_Logo.png';

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
        <img :src="logoImg" alt="SFU Logo" class="logo" />
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
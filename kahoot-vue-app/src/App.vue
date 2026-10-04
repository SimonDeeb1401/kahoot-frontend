<script setup lang="ts">
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
import { isDevelopment } from './environment'
</script>

<template>
  <div class="app-shell">
    <RouterView />
    <VueQueryDevtools v-if="isDevelopment" button-position="bottom-left" />
  </div>
</template>

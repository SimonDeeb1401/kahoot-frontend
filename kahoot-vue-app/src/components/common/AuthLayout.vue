<template>
  <main class="auth-layout">
    <aside class="auth-story" aria-label="Playroom">
      <RouterLink class="brand-mark" to="/login" aria-label="Playroom home">
        playroom<span aria-hidden="true">!</span>
      </RouterLink>

      <div class="story-copy">
        <p class="story-kicker">LEARN LOUDER</p>
        <h1>Curiosity is<br />better together.</h1>
        <p class="story-description">Make room for bright ideas, quick rounds, and happy surprises.</p>
      </div>

      <div class="story-tiles" aria-hidden="true">
        <span class="story-tile story-tile--play">PLAY</span>
        <span class="story-tile story-tile--think">THINK</span>
        <span class="story-tile story-tile--share">SHARE</span>
      </div>

      <p class="story-footer">A little play goes a long way.</p>
    </aside>

    <section class="auth-content">
      <div class="auth-panel">
        <slot />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

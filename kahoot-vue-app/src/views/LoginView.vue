<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const registered = computed(() => route.query.registered === '1')

async function submit(): Promise<void> {
  const succeeded = await auth.login({
    email: email.value.trim().toLowerCase(),
    password: password.value,
  })

  if (succeeded) await router.replace({ name: 'dashboard' })
}
</script>

<template>
  <AuthLayout>
    <header class="auth-heading">
      <p class="auth-eyebrow">YOUR SEAT IS SAVED</p>
      <h2>Welcome back</h2>
      <p class="auth-subtitle">Sign in and pick up where the fun begins.</p>
    </header>

    <p v-if="registered" class="form-notice" role="status">
      Your account is ready. Sign in to get started.
    </p>
    <p v-if="auth.error" class="form-error" role="alert">{{ auth.error }}</p>

    <form class="auth-form" @submit.prevent="submit">
      <div class="form-field">
        <label for="login-email">Email</label>
        <input
          id="login-email"
          v-model="email"
          autocomplete="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          maxlength="254"
          required
          @input="auth.clearError()"
        />
      </div>

      <div class="form-field">
        <label for="login-password">Password</label>
        <input
          id="login-password"
          v-model="password"
          autocomplete="current-password"
          name="password"
          type="password"
          placeholder="Enter your password"
          maxlength="72"
          required
          @input="auth.clearError()"
        />
      </div>

      <button class="auth-submit" type="submit" :disabled="auth.isLoading">
        {{ auth.isLoading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <p class="auth-switch">
      New around here?
      <RouterLink to="/signup">Create an account</RouterLink>
    </p>
  </AuthLayout>
</template>

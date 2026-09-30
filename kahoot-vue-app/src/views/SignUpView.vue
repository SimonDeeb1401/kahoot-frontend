<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { ref } from 'vue'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')

async function submit(): Promise<void> {
  const succeeded = await auth.signup({
    username: username.value.trim(),
    email: email.value.trim().toLowerCase(),
    password: password.value,
  })

  if (succeeded) await router.replace({ name: 'login', query: { registered: '1' } })
}
</script>

<template>
  <AuthLayout>
    <header class="auth-heading">
      <p class="auth-eyebrow">COME ON IN</p>
      <h2>Create your account</h2>
      <p class="auth-subtitle">One small signup. A lot of brilliant moments.</p>
    </header>

    <p v-if="auth.error" class="form-error" role="alert">{{ auth.error }}</p>

    <form class="auth-form" @submit.prevent="submit">
      <div class="form-field">
        <label for="signup-username">Username</label>
        <input
          id="signup-username"
          v-model="username"
          autocomplete="username"
          name="username"
          type="text"
          placeholder="What should we call you?"
          minlength="3"
          maxlength="32"
          pattern="[A-Za-z0-9_\-]+"
          required
          @input="auth.clearError()"
        />
      </div>

      <div class="form-field">
        <label for="signup-email">Email</label>
        <input
          id="signup-email"
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
        <label for="signup-password">Password</label>
        <input
          id="signup-password"
          v-model="password"
          autocomplete="new-password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          minlength="8"
          maxlength="72"
          required
          aria-describedby="signup-password-hint"
          @input="auth.clearError()"
        />
        <span id="signup-password-hint" class="field-hint">Use at least 8 characters.</span>
      </div>

      <button class="auth-submit" type="submit" :disabled="auth.isLoading">
        {{ auth.isLoading ? 'Creating account...' : 'Create account' }}
      </button>
    </form>

    <p class="auth-switch">
      Already have an account?
      <RouterLink to="/login">Sign in</RouterLink>
    </p>
  </AuthLayout>
</template>

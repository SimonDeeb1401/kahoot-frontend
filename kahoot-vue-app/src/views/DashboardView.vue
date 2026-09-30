<script setup lang="ts">
import { useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()

async function logout(): Promise<void> {
	auth.logout()
	await router.replace({ name: 'login' })
}
</script>

<template>
	<AuthLayout>
		<header class="auth-heading">
			<p class="auth-eyebrow">YOU'RE IN</p>
			<h2>Good to have you, {{ auth.user?.username }}.</h2>
			<p class="auth-subtitle">Your next round is just around the corner.</p>
		</header>
		<button class="auth-submit auth-submit--centered" type="button" @click="logout">Sign out</button>
	</AuthLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const quizCreated = ref(false)

onMounted(async () => {
	if (route.query.created === '1') {
		quizCreated.value = true
		await router.replace({ name: 'dashboard' })
	}
})

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
		<p v-if="quizCreated" class="form-notice" role="status">Quiz created successfully.</p>
		<div class="dashboard-actions">
			<RouterLink class="auth-submit" :to="{ name: 'create-quiz' }">Create a quiz</RouterLink>
			<button class="auth-submit auth-submit--secondary" type="button" @click="logout">Sign out</button>
		</div>
	</AuthLayout>
</template>

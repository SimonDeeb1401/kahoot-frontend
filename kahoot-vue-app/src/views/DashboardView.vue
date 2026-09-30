<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LogOut, Plus } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { quizService } from '../services/quizService'
import type { Quiz } from '../types/quiz'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const quizzes = ref<Quiz[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const quizCreated = ref(false)

async function loadQuizzes(): Promise<void> {
	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	isLoading.value = true
	error.value = null
	try {
		quizzes.value = await quizService.findAll(accessToken)
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to load your quizzes.'
	} finally {
		isLoading.value = false
	}
}

onMounted(async () => {
	if (route.query.created === '1') {
		quizCreated.value = true
		await router.replace({ name: 'dashboard' })
	}
	await loadQuizzes()
})

async function logout(): Promise<void> {
	auth.logout()
	await router.replace({ name: 'login' })
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}
</script>

<template>
	<main class="dashboard-page">
		<button
			class="dashboard-icon-button dashboard-signout"
			type="button"
			aria-label="Sign out"
			title="Sign out"
			@click="logout"
		>
			<LogOut :size="19" :stroke-width="2" aria-hidden="true" />
		</button>

		<section class="dashboard-main" aria-labelledby="dashboard-title">
			<header class="dashboard-heading">
				<p class="dashboard-eyebrow">{{ auth.user?.username }}</p>
				<h1 id="dashboard-title">My quizzes</h1>
			</header>

			<p v-if="quizCreated" class="form-notice" role="status">Quiz created successfully.</p>
			<p v-if="isLoading" class="dashboard-message" role="status">Loading quizzes...</p>

			<div v-else-if="error" class="dashboard-error" role="alert">
				<p>{{ error }}</p>
				<button class="dashboard-retry" type="button" @click="loadQuizzes">Try again</button>
			</div>

			<div v-else-if="quizzes.length === 0" class="dashboard-empty">
				<h2>No quizzes yet</h2>
				<p>Your created quizzes will appear here.</p>
			</div>

			<ul v-else class="quiz-list" aria-label="My quizzes">
				<li v-for="quiz in quizzes" :key="quiz.id" class="quiz-row">
					<div class="quiz-row-copy">
						<h2>{{ quiz.title }}</h2>
						<p>{{ quiz.description || 'No description' }}</p>
					</div>
					<time :datetime="quiz.createdAt">{{ formatDate(quiz.createdAt) }}</time>
				</li>
			</ul>
		</section>

		<RouterLink
			class="dashboard-create"
			:to="{ name: 'create-quiz' }"
			aria-label="Create a quiz"
			title="Create a quiz"
		>
			<Plus :size="25" :stroke-width="2.5" aria-hidden="true" />
		</RouterLink>
	</main>
</template>

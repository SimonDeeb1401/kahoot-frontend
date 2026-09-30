<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LogOut, Plus, Trash2 } from '@lucide/vue'
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
const deleteError = ref<string | null>(null)
const deleteSuccess = ref(false)
const deletingQuizId = ref<number | null>(null)
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

async function deleteQuiz(quiz: Quiz): Promise<void> {
	if (deletingQuizId.value !== null) return
	if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return

	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	deletingQuizId.value = quiz.id
	deleteError.value = null
	deleteSuccess.value = false
	try {
		await quizService.remove(quiz.id, accessToken)
		quizzes.value = quizzes.value.filter((item) => item.id !== quiz.id)
		deleteSuccess.value = true
	} catch (cause) {
		deleteError.value = cause instanceof Error ? cause.message : 'Unable to delete the quiz.'
	} finally {
		deletingQuizId.value = null
	}
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
			<p v-if="deleteSuccess" class="form-notice" role="status">Quiz deleted successfully.</p>
			<p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
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
					<div class="quiz-row-actions">
						<time :datetime="quiz.createdAt">{{ formatDate(quiz.createdAt) }}</time>
						<button
							class="quiz-delete-button"
							type="button"
							:aria-label="`Delete ${quiz.title}`"
							:title="`Delete ${quiz.title}`"
							:disabled="deletingQuizId !== null"
							@click="deleteQuiz(quiz)"
						>
							<Trash2 :size="18" :stroke-width="2" aria-hidden="true" />
						</button>
					</div>
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

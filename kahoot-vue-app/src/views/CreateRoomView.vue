<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import { quizService } from '../services/quizService'
import type { Quiz } from '../types/quiz'

const auth = useAuth()
const router = useRouter()
const quizzes = ref<Quiz[]>([])
const selectedQuizId = ref<number | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

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
		selectedQuizId.value = quizzes.value[0]?.id ?? null
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to load your quizzes.'
	} finally {
		isLoading.value = false
	}
}

onMounted(loadQuizzes)

async function submit(): Promise<void> {
	if (isSubmitting.value) return
	if (selectedQuizId.value === null) {
		error.value = 'Choose a quiz to host.'
		return
	}

	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	isSubmitting.value = true
	error.value = null
	try {
		await gameSessionService.create({ quizId: selectedQuizId.value }, accessToken)
		await router.replace({ name: 'dashboard', query: { view: 'rooms', created: 'room' } })
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to create the room.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<AuthLayout>
		<header class="auth-heading">
			<p class="auth-eyebrow">HOST A GAME</p>
			<h2>Create a room</h2>
			<p class="auth-subtitle">Choose a quiz. We’ll create a join code for your players.</p>
		</header>

		<p v-if="error" class="form-error" role="alert">{{ error }}</p>

		<div v-if="isLoading" class="dashboard-message" role="status">Loading your quizzes...</div>
		<div v-else-if="quizzes.length === 0" class="dashboard-empty room-create-empty">
			<h2>No quizzes available</h2>
			<p>Create a quiz before starting a room.</p>
			<RouterLink class="auth-submit" :to="{ name: 'create-quiz' }">Create a quiz</RouterLink>
		</div>
		<form v-else class="auth-form" @submit.prevent="submit">
			<div class="form-field">
				<label for="room-quiz">Quiz</label>
				<select id="room-quiz" v-model.number="selectedQuizId" name="quizId" required>
					<option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
						{{ quiz.title }}
					</option>
				</select>
			</div>
			<button class="auth-submit" type="submit" :disabled="isSubmitting">
				{{ isSubmitting ? 'Creating room...' : 'Create room' }}
			</button>
		</form>

		<p class="auth-switch">
			<RouterLink :to="{ name: 'dashboard', query: { view: 'rooms' } }">Cancel and return to rooms</RouterLink>
		</p>
	</AuthLayout>
</template>

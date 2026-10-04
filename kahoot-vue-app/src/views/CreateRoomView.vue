<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import { queryKeys } from '../queries/queryKeys'
import { useQuizListQuery } from '../queries/useQuizQueries'

const auth = useAuth()
const router = useRouter()
const queryClient = useQueryClient()
const quizQuery = useQuizListQuery()
const quizzes = computed(() => quizQuery.data.value ?? [])
const selectedQuizId = ref<number | null>(null)
const isLoading = quizQuery.isLoading
const createRoomMutation = useMutation({
	mutationFn: ({ quizId, accessToken }: { quizId: number; userId: number; accessToken: string }) =>
		gameSessionService.create({ quizId }, accessToken),
	onSuccess: async (_, { userId }) => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.hostedRooms(userId) })
	},
})
const isSubmitting = createRoomMutation.isPending
const error = ref<string | null>(null)

watch(quizQuery.data, (loadedQuizzes) => {
	if (selectedQuizId.value === null) selectedQuizId.value = loadedQuizzes?.[0]?.id ?? null
}, { immediate: true })

async function submit(): Promise<void> {
	if (isSubmitting.value) return
	if (selectedQuizId.value === null) {
		error.value = 'Choose a quiz to host.'
		return
	}

	const accessToken = auth.accessToken
	const userId = auth.user?.id
	if (!accessToken || !userId) {
		await router.replace({ name: 'login' })
		return
	}

	error.value = null
	try {
		await createRoomMutation.mutateAsync({
			quizId: selectedQuizId.value,
			accessToken,
			userId,
		})
		await router.replace({ name: 'dashboard', query: { view: 'rooms', created: 'room' } })
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to create the room.'
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
		<div v-else-if="quizQuery.error.value" class="dashboard-error" role="alert">
			<p>{{ quizQuery.error.value instanceof Error ? quizQuery.error.value.message : 'Unable to load your quizzes.' }}</p>
			<button class="dashboard-retry" type="button" @click="quizQuery.refetch()">Try again</button>
		</div>
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

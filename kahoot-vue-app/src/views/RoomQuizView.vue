<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import type { JoinableRoomDetails } from '../types/game-session'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const room = ref<JoinableRoomDetails | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

async function loadRoom(): Promise<void> {
	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	const sessionId = Number(route.params.sessionId)
	if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
		error.value = 'This room could not be found.'
		isLoading.value = false
		return
	}

	isLoading.value = true
	error.value = null
	try {
		room.value = await gameSessionService.findJoinableOne(sessionId, accessToken)
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to load this room.'
	} finally {
		isLoading.value = false
	}
}

onMounted(loadRoom)
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader active="rooms" />
		<section class="dashboard-main room-preview-main">
			<p v-if="isLoading" class="dashboard-message" role="status">Loading quiz...</p>
			<div v-else-if="error" class="dashboard-error" role="alert">
				<p>{{ error }}</p>
				<RouterLink class="room-preview-back" :to="{ name: 'available-rooms' }">
					Back to available rooms
				</RouterLink>
			</div>
			<template v-else-if="room">
				<RouterLink class="room-preview-back" :to="{ name: 'available-rooms' }">
					Back to available rooms
				</RouterLink>
				<header class="dashboard-heading room-preview-heading">
					<p class="dashboard-eyebrow">ROOM {{ room.roomCode }} | HOSTED BY {{ room.hostUsername }}</p>
					<h1>{{ room.quiz.title }}</h1>
					<p v-if="room.quiz.description" class="dashboard-subtitle">
						{{ room.quiz.description }}
					</p>
					<p class="room-preview-count">
						{{ room.quiz.questions.length }}
						{{ room.quiz.questions.length === 1 ? 'question' : 'questions' }}
					</p>
				</header>

				<ol v-if="room.quiz.questions.length" class="preview-question-list">
					<li v-for="(question, index) in room.quiz.questions" :key="question.id" class="preview-question">
						<div class="preview-question-heading">
							<span class="preview-question-number">{{ String(index + 1).padStart(2, '0') }}</span>
							<p class="preview-question-meta">{{ question.timeLimit }} sec · {{ question.points }} points</p>
						</div>
						<h2>{{ question.text }}</h2>
						<ul class="preview-answer-list">
							<li v-for="answer in question.answers" :key="answer.id">{{ answer.text }}</li>
						</ul>
					</li>
				</ol>
				<div v-else class="dashboard-empty">
					<h2>This quiz has no questions yet</h2>
				</div>
			</template>
		</section>
	</main>
</template>

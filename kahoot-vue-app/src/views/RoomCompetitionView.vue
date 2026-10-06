<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Socket } from 'socket.io-client'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import {
	createGameSocket,
	isAnswerFeedback,
	isAnswerProgress,
	isCompetitionFinished,
	isCompetitionQuiz,
	isQuestionDelivery,
	isRoomSnapshot,
} from '../services/game-socket-service'
import { restoreJoinedRoomIdentity } from '../services/joined-room-storage'
import type {
	AnswerFeedback,
	AnswerProgress,
	LeaderboardEntry,
	CompetitionQuiz,
	QuestionDelivery,
} from '../types/game-session'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const competition = ref<CompetitionQuiz | null>(null)
const isHost = route.query.role === 'host'
const isResultsView = route.query.results === '1'
const delivery = ref<QuestionDelivery | null>(null)
const progress = ref<AnswerProgress | null>(null)
const feedback = ref<AnswerFeedback | null>(null)
const leaderboard = ref<LeaderboardEntry[]>([])
const selectedAnswerId = ref<number | null>(null)
const isConnected = ref(false)
const isSubmitting = ref(false)
const isAdvancing = ref(false)
const isFinished = ref(false)
const error = ref<string | null>(null)
const currentTime = ref(Date.now())
let socket: Socket | null = null
let timerInterval: ReturnType<typeof setInterval> | undefined

const secondsRemaining = computed(() => {
	if (!delivery.value) return 0
	return Math.max(0, Math.ceil((new Date(delivery.value.endsAt).getTime() - currentTime.value) / 1000))
})
const canAdvance = computed(
	() =>
		isHost &&
		!!delivery.value &&
		!!progress.value &&
		(progress.value.answeredCount >= progress.value.totalPlayers || secondsRemaining.value === 0),
)

function setCompetition(value: unknown, sessionId: number): void {
	if (!isCompetitionQuiz(value) || value.sessionId !== sessionId) return
	competition.value = value
	sessionStorage.setItem(`kahoot:competition:${sessionId}`, JSON.stringify(value))
}

onMounted(async () => {
	const sessionId = Number(route.params.sessionId)
	const userId = auth.user?.id
	const accessToken = auth.accessToken
	if (!Number.isSafeInteger(sessionId) || sessionId < 1 || !accessToken || !userId) {
		await router.replace({ name: auth.accessToken ? 'dashboard' : 'login' })
		return
	}

	const storageKey = `kahoot:competition:${sessionId}`
	const storedCompetition = sessionStorage.getItem(storageKey)
	let hasStoredCompetition = false
	if (storedCompetition) {
		try {
			const parsedCompetition: unknown = JSON.parse(storedCompetition)
			if (isCompetitionQuiz(parsedCompetition) && parsedCompetition.sessionId === sessionId) {
				competition.value = parsedCompetition
				hasStoredCompetition = true
			}
		} catch {
			sessionStorage.removeItem(storageKey)
		}
	}
	if (!hasStoredCompetition && !isResultsView) {
		await router.replace({
			name: isHost ? 'host-room-lobby' : 'room-lobby',
			params: { sessionId },
		})
		return
	}

	let playerId: number | undefined
	if (!isHost) {
		let joinedRoom
		try {
			joinedRoom = await restoreJoinedRoomIdentity(userId, sessionId, accessToken)
		} catch {
			error.value = 'Unable to restore your room. Please try again.'
			return
		}
		playerId = joinedRoom?.playerId
		if (!playerId) {
			await router.replace({ name: 'available-rooms' })
			return
		}
	}

	socket = createGameSocket(accessToken)
	socket.on('connect', () => {
		isConnected.value = true
		error.value = null
		socket?.emit('join-room', { sessionId, playerId })
	})
	socket.on('disconnect', () => {
		isConnected.value = false
		isSubmitting.value = false
		isAdvancing.value = false
	})
	socket.on('connect_error', () => {
		error.value = 'Connection lost. Reconnecting to the competition...'
	})
	socket.on('room-state', (value: unknown) => {
		if (!isRoomSnapshot(value) || value.sessionId !== sessionId || value.role !== (isHost ? 'host' : 'player')) {
			error.value = 'You are not a member of this competition.'
			return
		}
		if (value.competition) setCompetition(value.competition, sessionId)
		if (value.status === 'completed' && value.leaderboard) {
			leaderboard.value = value.leaderboard
			isFinished.value = true
			delivery.value = null
		} else if (isResultsView) {
			error.value = 'The leaderboard is not available for this room.'
		}
	})
	socket.on('competition-started', (value: unknown) => setCompetition(value, sessionId))
	socket.on('question-delivered', (value: unknown) => {
		if (!isQuestionDelivery(value) || value.sessionId !== sessionId) return
		delivery.value = value
		progress.value = null
		feedback.value = null
		selectedAnswerId.value = null
		isSubmitting.value = false
		isAdvancing.value = false
		currentTime.value = Date.now()
		if (isHost) {
			const activeCompetition = competition.value
			if (activeCompetition) {
				activeCompetition.quiz.questions = [value.question]
			}
		}
	})
	socket.on('answer-progress', (value: unknown) => {
		if (isAnswerProgress(value) && value.sessionId === sessionId) progress.value = value
	})
	socket.on('answer-feedback', (value: unknown) => {
		if (!isAnswerFeedback(value) || value.sessionId !== sessionId) return
		feedback.value = value
		selectedAnswerId.value = value.selectedAnswerId
		isSubmitting.value = false
	})
	socket.on('competition-finished', (value: unknown) => {
		if (isCompetitionFinished(value) && value.sessionId === sessionId) {
			leaderboard.value = value.leaderboard
			isFinished.value = true
			delivery.value = null
			isAdvancing.value = false
		}
	})
	socket.on('room-error', (value: unknown) => {
		isSubmitting.value = false
		isAdvancing.value = false
		if (selectedAnswerId.value !== null && !feedback.value) selectedAnswerId.value = null
		if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
			error.value = value.message
		}
	})
	socket.connect()
	timerInterval = setInterval(() => {
		currentTime.value = Date.now()
	}, 250)
})

onUnmounted(() => {
	if (timerInterval) clearInterval(timerInterval)
	socket?.disconnect()
})

function chooseAnswer(answerId: number): void {
	if (isHost || !socket?.connected || !delivery.value || feedback.value || isSubmitting.value || secondsRemaining.value === 0) return
	selectedAnswerId.value = answerId
	isSubmitting.value = true
	error.value = null
	socket.emit('submit-answer', {
		questionId: delivery.value.question.id,
		answerId,
	})
}

function advanceQuestion(): void {
	if (!isHost || !socket?.connected || !delivery.value || !canAdvance.value || isAdvancing.value) return
	isAdvancing.value = true
	error.value = null
	socket.emit('next-question', { sessionId: delivery.value.sessionId })
}
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader :active="isHost ? 'dashboard' : 'rooms'" />
		<section v-if="competition || isResultsView" class="dashboard-main competition-main">
			<header class="dashboard-heading competition-heading">
				<p class="dashboard-eyebrow">ROOM {{ competition?.roomCode ?? route.params.sessionId }} | {{ isHost ? 'HOST VIEW' : 'PLAYER VIEW' }}</p>
				<h1>{{ competition?.quiz.title ?? 'Game results' }}</h1>
				<p v-if="competition?.quiz.description" class="dashboard-subtitle">{{ competition.quiz.description }}</p>
			</header>

			<p v-if="error" class="form-error" role="alert">{{ error }}</p>
			<p v-if="!isConnected && !error" class="dashboard-message" role="status">
				{{ isResultsView ? 'Loading results...' : 'Reconnecting to the competition...' }}
			</p>

			<section v-if="isFinished" class="competition-finished" aria-live="polite">
				<p class="dashboard-eyebrow">QUIZ COMPLETE</p>
				<h2>Final leaderboard</h2>
				<ol class="competition-leaderboard" aria-label="Final leaderboard">
					<li v-for="(entry, index) in leaderboard" :key="entry.id">
						<span class="competition-leaderboard-rank">{{ index + 1 }}</span>
						<span class="competition-leaderboard-name">{{ entry.nickname }}</span>
						<strong class="competition-leaderboard-score">{{ entry.score.toLocaleString() }}</strong>
					</li>
				</ol>
				<RouterLink class="room-lobby-back" :to="{ name: 'dashboard', query: { view: 'rooms' } }">
					Return to rooms
				</RouterLink>
			</section>

			<section v-else-if="delivery" class="competition-round" aria-live="polite">
				<div class="competition-round-bar">
					<p class="dashboard-eyebrow">QUESTION {{ delivery.questionNumber }} OF {{ delivery.totalQuestions }}</p>
					<div class="competition-timer" :class="{ 'competition-timer--ended': secondsRemaining === 0 }" role="timer" :aria-label="`${secondsRemaining} seconds remaining`">
						<span>{{ secondsRemaining }}</span><span class="competition-timer-unit">SEC</span>
					</div>
				</div>

				<div class="competition-live-question">
					<p>{{ delivery.question.points }} points</p>
					<h2>{{ delivery.question.text }}</h2>
				</div>

				<template v-if="isHost">
					<div class="host-answer-summary" role="status">
						<strong>{{ progress?.answeredCount ?? 0 }} / {{ progress?.totalPlayers ?? 0 }}</strong>
						<span>players answered</span>
					</div>
					<ol class="host-answer-results" aria-label="Answer counts">
						<li v-for="answer in delivery.question.answers" :key="answer.id">
							<div class="host-answer-result-label">
								<span>{{ answer.text }}</span>
								<strong>{{ progress?.answerCounts.find((item) => item.answerId === answer.id)?.count ?? 0 }}</strong>
							</div>
							<div class="host-answer-track" aria-hidden="true">
								<span :style="{ width: `${Math.min(100, ((progress?.answerCounts.find((item) => item.answerId === answer.id)?.count ?? 0) / Math.max(1, progress?.totalPlayers ?? 0)) * 100)}%` }"></span>
							</div>
						</li>
					</ol>
					<div class="competition-host-controls">
						<p v-if="!canAdvance">Advance unlocks when everyone has answered or the timer ends.</p>
						<p v-else>Round is ready to advance.</p>
						<button class="auth-submit" type="button" :disabled="!isConnected || !canAdvance || isAdvancing" @click="advanceQuestion">
							{{ isAdvancing ? 'Advancing...' : 'Next question' }}
						</button>
					</div>
				</template>

				<template v-else>
					<div class="player-answer-grid" :class="{ 'player-answer-grid--locked': !!feedback || secondsRemaining === 0 }" aria-label="Choose an answer">
						<button
							v-for="(answer, index) in delivery.question.answers"
							:key="answer.id"
							class="player-answer-option"
							:class="{
								'player-answer-option--selected': selectedAnswerId === answer.id,
								'player-answer-option--correct': feedback?.correctAnswerId === answer.id,
								'player-answer-option--incorrect': feedback?.selectedAnswerId === answer.id && !feedback.isCorrect,
							}"
							type="button"
							:disabled="!isConnected || !!feedback || isSubmitting || secondsRemaining === 0"
							:aria-pressed="selectedAnswerId === answer.id"
							@click="chooseAnswer(answer.id)"
						>
							<span class="player-answer-index">{{ String.fromCharCode(65 + index) }}</span>
							<span>{{ answer.text }}</span>
						</button>
					</div>
					<p v-if="feedback" class="player-feedback" :class="{ 'player-feedback--correct': feedback.isCorrect }" role="status">
						{{ feedback.isCorrect ? 'Correct!' : 'Not quite.' }}
						<span>{{ feedback.pointsAwarded }} points earned | Total score: {{ feedback.totalScore }}</span>
						<span v-if="!feedback.isCorrect">The correct answer is {{ delivery.question.answers.find((answer) => answer.id === feedback?.correctAnswerId)?.text ?? 'shown above' }}.</span>
					</p>
					<p v-else-if="isSubmitting" class="player-wait-message" role="status">Answer sent. Checking your answer...</p>
					<p v-else-if="secondsRemaining === 0" class="player-wait-message" role="status">Time is up. Waiting for the host to continue.</p>
					<p v-else class="player-wait-message">Choose an answer to lock in your response.</p>
				</template>
			</section>
		</section>
	</main>
</template>

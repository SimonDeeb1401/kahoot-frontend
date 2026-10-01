<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { isCompetitionQuiz } from '../services/gameSocketService'
import type { CompetitionQuiz } from '../types/game-session'

const route = useRoute()
const router = useRouter()
const competition = ref<CompetitionQuiz | null>(null)
const isHost = route.query.role === 'host'

onMounted(async () => {
	const sessionId = Number(route.params.sessionId)
	const storageKey = `kahoot:competition:${sessionId}`
	const storedCompetition = sessionStorage.getItem(storageKey)
	if (storedCompetition) {
		try {
			const parsedCompetition: unknown = JSON.parse(storedCompetition)
			if (isCompetitionQuiz(parsedCompetition) && parsedCompetition.sessionId === sessionId) {
				competition.value = parsedCompetition
				return
			}
		} catch {
			sessionStorage.removeItem(storageKey)
		}
	}

	await router.replace({
		name: isHost ? 'host-room-lobby' : 'room-lobby',
		params: { sessionId },
	})
})
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader :active="isHost ? 'dashboard' : 'rooms'" />
		<section v-if="competition" class="dashboard-main competition-main">
			<header class="dashboard-heading competition-heading">
				<p class="dashboard-eyebrow">ROOM {{ competition.roomCode }} | LIVE COMPETITION</p>
				<h1>{{ competition.quiz.title }}</h1>
				<p v-if="competition.quiz.description" class="dashboard-subtitle">
					{{ competition.quiz.description }}
				</p>
			</header>

			<ol class="competition-question-list">
				<li v-for="(question, index) in competition.quiz.questions" :key="question.id">
					<div class="competition-question-meta">
						<span>QUESTION {{ index + 1 }}</span>
						<span>{{ question.timeLimit }} sec | {{ question.points }} points</span>
					</div>
					<h2>{{ question.text }}</h2>
					<ul class="competition-answer-list">
						<li v-for="answer in question.answers" :key="answer.id">{{ answer.text }}</li>
					</ul>
				</li>
			</ol>

			<RouterLink
				class="room-lobby-back"
				:to="isHost ? { name: 'dashboard', query: { view: 'rooms' } } : { name: 'room-lobby', params: { sessionId: competition.sessionId } }"
			>
				{{ isHost ? 'Back to dashboard' : 'Back to lobby' }}
			</RouterLink>
		</section>
	</main>
</template>

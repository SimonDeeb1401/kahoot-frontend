<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import { quizService } from '../services/quizService'
import type { GameSession } from '../types/game-session'
import type { Quiz } from '../types/quiz'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const activeTab = computed(() => (route.query.view === 'rooms' ? 'rooms' : 'quizzes'))
const createTarget = computed(() => ({ name: activeTab.value === 'rooms' ? 'create-room' : 'create-quiz' }))
const createLabel = computed(() => (activeTab.value === 'rooms' ? 'Create a room' : 'Create a quiz'))
const quizzes = ref<Quiz[]>([])
const rooms = ref<GameSession[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const isLoadingRooms = ref(true)
const roomsError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const deleteSuccess = ref(false)
const deletingQuizId = ref<number | null>(null)
const quizCreated = ref(false)
const roomCreated = ref(false)

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

async function loadRooms(): Promise<void> {
	const accessToken = auth.accessToken
	if (!accessToken) return

	isLoadingRooms.value = true
	roomsError.value = null
	try {
		rooms.value = await gameSessionService.findAll(accessToken)
	} catch (cause) {
		roomsError.value = cause instanceof Error ? cause.message : 'Unable to load your hosted rooms.'
	} finally {
		isLoadingRooms.value = false
	}
}

async function setActiveTab(tab: 'quizzes' | 'rooms'): Promise<void> {
	if (activeTab.value === tab) return
	await router.replace({ name: 'dashboard', query: { ...route.query, view: tab } })
}

onMounted(async () => {
	if (!auth.accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	if (route.query.created !== undefined) {
		quizCreated.value = route.query.created === '1' || route.query.created === 'quiz'
		roomCreated.value = route.query.created === 'room'
		const query = { ...route.query }
		delete query.created
		await router.replace({ name: 'dashboard', query })
	}
	await Promise.all([loadQuizzes(), loadRooms()])
})

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

function quizTitleForRoom(room: GameSession): string {
	return quizzes.value.find((quiz) => quiz.id === room.quizId)?.title ?? `Quiz #${room.quizId}`
}
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader active="dashboard" />
		<div class="dashboard-tabs" role="tablist" aria-label="Dashboard collections">
			<button
				class="dashboard-tab"
				:class="{ 'dashboard-tab--active': activeTab === 'quizzes' }"
				role="tab"
				:aria-selected="activeTab === 'quizzes'"
				aria-controls="dashboard-content"
				type="button"
				@click="setActiveTab('quizzes')"
			>
				Quizzes
			</button>
			<button
				class="dashboard-tab"
				:class="{ 'dashboard-tab--active': activeTab === 'rooms' }"
				role="tab"
				:aria-selected="activeTab === 'rooms'"
				aria-controls="dashboard-content"
				type="button"
				@click="setActiveTab('rooms')"
			>
				Rooms
			</button>
		</div>

		<section id="dashboard-content" class="dashboard-main" role="tabpanel" aria-labelledby="dashboard-title">
			<header class="dashboard-heading">
				<p class="dashboard-eyebrow">{{ auth.user?.username }}</p>
				<h1 id="dashboard-title">{{ activeTab === 'rooms' ? 'Hosted rooms' : 'My quizzes' }}</h1>
			</header>

			<p v-if="quizCreated" class="form-notice" role="status">Quiz created successfully.</p>
			<p v-if="roomCreated" class="form-notice" role="status">Room created successfully.</p>
			<p v-if="deleteSuccess" class="form-notice" role="status">Quiz deleted successfully.</p>
			<p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>

			<template v-if="activeTab === 'quizzes'">
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
							<RouterLink
								class="quiz-edit-button"
								:to="{ name: 'edit-quiz', params: { quizId: quiz.id } }"
								:aria-label="`Edit ${quiz.title}`"
								:title="`Edit ${quiz.title}`"
							>
								<Pencil :size="17" :stroke-width="2" aria-hidden="true" />
							</RouterLink>
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
			</template>

			<template v-else>
				<p v-if="isLoadingRooms" class="dashboard-message" role="status">Loading hosted rooms...</p>
				<div v-else-if="roomsError" class="dashboard-error" role="alert">
					<p>{{ roomsError }}</p>
					<button class="dashboard-retry" type="button" @click="loadRooms">Try again</button>
				</div>
				<div v-else-if="rooms.length === 0" class="dashboard-empty">
					<h2>No rooms hosted yet</h2>
					<p>Create a room from one of your quizzes to host a game.</p>
				</div>
				<ul v-else class="rooms-grid" aria-label="My hosted rooms">
					<li v-for="room in rooms" :key="room.id" class="room-card">
						<p class="room-code-label">ROOM CODE</p>
						<p class="room-code">{{ room.roomCode }}</p>
						<h2>{{ quizTitleForRoom(room) }}</h2>
						<p class="room-status" :class="`room-status--${room.status}`">{{ room.status }}</p>
					</li>
				</ul>
			</template>
		</section>

		<RouterLink
			class="dashboard-create"
			:to="createTarget"
			:aria-label="createLabel"
			:title="createLabel"
		>
			<Plus :size="25" :stroke-width="2.5" aria-hidden="true" />
		</RouterLink>
	</main>
</template>

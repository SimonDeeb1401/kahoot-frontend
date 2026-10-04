<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { Pencil, Plus, Trash2, Users } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import { quizService } from '../services/quizService'
import { useHostedRoomsQuery, useJoinedRoomsQuery } from '../queries/useGameSessionQueries'
import { queryKeys } from '../queries/queryKeys'
import { useQuizListQuery } from '../queries/useQuizQueries'
import type { GameSession, JoinedRoomSummary } from '../types/game-session'
import type { Quiz } from '../types/quiz'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const activeTab = computed(() => (route.query.view === 'rooms' ? 'rooms' : 'quizzes'))
const createTarget = computed(() => ({ name: activeTab.value === 'rooms' ? 'create-room' : 'create-quiz' }))
const createLabel = computed(() => (activeTab.value === 'rooms' ? 'Create a room' : 'Create a quiz'))
const quizQuery = useQuizListQuery()
const hostedRoomsQuery = useHostedRoomsQuery()
const joinedRoomsQuery = useJoinedRoomsQuery()
const quizzes = computed(() => quizQuery.data.value ?? [])
const rooms = computed(() => hostedRoomsQuery.data.value ?? [])
const joinedRooms = computed(() => joinedRoomsQuery.data.value ?? [])
const isLoading = quizQuery.isLoading
const error = computed(() =>
	quizQuery.error.value instanceof Error ? quizQuery.error.value.message : null,
)
const isLoadingRooms = hostedRoomsQuery.isLoading
const roomsError = computed(() =>
	hostedRoomsQuery.error.value instanceof Error ? hostedRoomsQuery.error.value.message : null,
)
const isLoadingJoinedRooms = joinedRoomsQuery.isLoading
const joinedRoomsError = computed(() =>
	joinedRoomsQuery.error.value instanceof Error ? joinedRoomsQuery.error.value.message : null,
)
const deleteError = ref<string | null>(null)
const deleteSuccess = ref(false)
const quizCreated = ref(false)
const roomCreated = ref(false)
const deleteQuizMutation = useMutation({
	mutationFn: ({ quizId, accessToken }: { quizId: number; userId: number; accessToken: string }) =>
		quizService.remove(quizId, accessToken),
	onSuccess: async (_, { quizId, userId }) => {
		queryClient.setQueryData<Quiz[]>(queryKeys.quizList(userId), (current) =>
			current?.filter((quiz) => quiz.id !== quizId),
		)
		queryClient.removeQueries({ queryKey: queryKeys.quizEditor(userId, quizId) })
	},
})
const deletingQuizId = computed(() =>
	deleteQuizMutation.isPending.value ? deleteQuizMutation.variables.value?.quizId ?? null : null,
)

function openJoinedRoom(room: JoinedRoomSummary): void {
	sessionStorage.setItem(
		`kahoot:joined-room:${room.sessionId}`,
		JSON.stringify({
			playerId: room.playerId,
			sessionId: room.sessionId,
			roomCode: room.roomCode,
			nickname: room.nickname,
		}),
	)
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
})

async function deleteQuiz(quiz: Quiz): Promise<void> {
	if (deleteQuizMutation.isPending.value) return
	if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return

	const accessToken = auth.accessToken
	const userId = auth.user?.id
	if (!accessToken || !userId) {
		await router.replace({ name: 'login' })
		return
	}

	deleteError.value = null
	deleteSuccess.value = false
	try {
		await deleteQuizMutation.mutateAsync({ quizId: quiz.id, userId, accessToken })
		deleteSuccess.value = true
	} catch (cause) {
		deleteError.value = cause instanceof Error ? cause.message : 'Unable to delete the quiz.'
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
					<button class="dashboard-retry" type="button" @click="quizQuery.refetch()">Try again</button>
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
				<section class="rooms-section" aria-labelledby="hosted-rooms-title">
					<h2 id="hosted-rooms-title" class="rooms-section-title">Rooms you host</h2>
					<p v-if="isLoadingRooms" class="dashboard-message" role="status">Loading hosted rooms...</p>
					<div v-else-if="roomsError" class="dashboard-error" role="alert">
						<p>{{ roomsError }}</p>
						<button class="dashboard-retry" type="button" @click="hostedRoomsQuery.refetch()">Try again</button>
					</div>
					<div v-else-if="rooms.length === 0" class="dashboard-empty">
						<p>Create a room from one of your quizzes to host a game.</p>
					</div>
					<ul v-else class="rooms-grid" aria-label="My hosted rooms">
						<li v-for="room in rooms" :key="room.id" class="room-card">
							<p class="room-code-label">ROOM CODE</p>
							<p class="room-code">{{ room.roomCode }}</p>
							<h3>{{ quizTitleForRoom(room) }}</h3>
							<p class="room-status" :class="`room-status--${room.status}`">{{ room.status }}</p>
							<RouterLink
								v-if="room.status === 'waiting' || room.status === 'active'"
								class="room-host-action"
								:to="{ name: 'host-room-lobby', params: { sessionId: room.id } }"
							>
								<Users :size="16" aria-hidden="true" />
								{{ room.status === 'waiting' ? 'Open lobby' : 'Open competition' }}
							</RouterLink>
						</li>
					</ul>
				</section>

				<section class="rooms-section joined-rooms-section" aria-labelledby="joined-rooms-title">
					<h2 id="joined-rooms-title" class="rooms-section-title">Rooms you've joined</h2>
					<p v-if="isLoadingJoinedRooms" class="dashboard-message" role="status">Loading joined rooms...</p>
					<div v-else-if="joinedRoomsError" class="dashboard-error" role="alert">
						<p>{{ joinedRoomsError }}</p>
						<button class="dashboard-retry" type="button" @click="joinedRoomsQuery.refetch()">Try again</button>
					</div>
					<div v-else-if="joinedRooms.length === 0" class="dashboard-empty">
						<p>Rooms you join will appear here.</p>
					</div>
					<ul v-else class="rooms-grid" aria-label="Rooms I have joined">
						<li v-for="room in joinedRooms" :key="room.sessionId" class="room-card">
							<p class="room-code-label">ROOM CODE</p>
							<p class="room-code">{{ room.roomCode }}</p>
							<h3>{{ room.quizTitle }}</h3>
							<p class="room-status" :class="`room-status--${room.status}`">{{ room.status }}</p>
							<RouterLink
								v-if="room.status === 'waiting' || room.status === 'active'"
								class="room-host-action"
								:to="{ name: 'room-lobby', params: { sessionId: room.sessionId } }"
								@click="openJoinedRoom(room)"
							>
								<Users :size="16" aria-hidden="true" />
								{{ room.status === 'waiting' ? 'Open lobby' : 'Return to competition' }}
							</RouterLink>
						</li>
					</ul>
				</section>
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

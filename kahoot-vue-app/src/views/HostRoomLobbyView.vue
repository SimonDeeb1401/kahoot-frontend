<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { Socket } from 'socket.io-client'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import {
	createGameSocket,
	isCompetitionQuiz,
	isRoomPlayerList,
	isRoomSnapshot,
} from '../services/gameSocketService'
import type { RoomPlayerSummary } from '../types/game-session'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const players = ref<RoomPlayerSummary[]>([])
const roomCode = ref('')
const roomStatus = ref('waiting')
const isConnected = ref(false)
const isStarting = ref(false)
const error = ref<string | null>(null)
let socket: Socket | null = null
let isNavigating = false

async function showCompetition(value: unknown, sessionId: number): Promise<void> {
	if (!isCompetitionQuiz(value) || value.sessionId !== sessionId || isNavigating) return
	isNavigating = true
	sessionStorage.setItem(`kahoot:competition:${sessionId}`, JSON.stringify(value))
	await router.replace({
		name: 'room-competition',
		params: { sessionId },
		query: { role: 'host' },
	})
}

onMounted(async () => {
	const sessionId = Number(route.params.sessionId)
	if (!Number.isSafeInteger(sessionId) || sessionId < 1 || !auth.accessToken) {
		await router.replace({ name: auth.accessToken ? 'dashboard' : 'login' })
		return
	}

	socket = createGameSocket(auth.accessToken)
	socket.on('connect', () => {
		isConnected.value = true
		error.value = null
		socket?.emit('join-room', { sessionId })
	})
	socket.on('disconnect', () => {
		isConnected.value = false
		isStarting.value = false
	})
	socket.on('connect_error', () => {
		error.value = 'Unable to connect to the room. Reconnecting...'
	})
	socket.on('room-state', (value: unknown) => {
		if (!isRoomSnapshot(value) || value.sessionId !== sessionId || value.role !== 'host') {
			error.value = 'Only the host can manage this room.'
			return
		}
		roomCode.value = value.roomCode
		roomStatus.value = value.status
		players.value = value.players
		if (value.competition) void showCompetition(value.competition, sessionId)
	})
	socket.on('players-updated', (value: unknown) => {
		if (isRoomPlayerList(value)) players.value = value
	})
	socket.on('competition-started', (value: unknown) => {
		isStarting.value = false
		void showCompetition(value, sessionId)
	})
	socket.on('room-error', (value: unknown) => {
		isStarting.value = false
		if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
			error.value = value.message
		}
	})
	socket.connect()
})

onUnmounted(() => socket?.disconnect())

function startCompetition(): void {
	if (!socket?.connected || isStarting.value || roomStatus.value !== 'waiting') return
	isStarting.value = true
	error.value = null
	socket.emit('start-competition', { sessionId: Number(route.params.sessionId) })
}
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader active="dashboard" />
		<section class="dashboard-main room-lobby-main">
			<header class="dashboard-heading room-lobby-heading">
				<p class="dashboard-eyebrow">HOST LOBBY<span v-if="roomCode"> | ROOM {{ roomCode }}</span></p>
				<h1>Players are joining</h1>
				<p class="dashboard-subtitle">Start the competition when your players are ready.</p>
			</header>

			<p v-if="error" class="form-error" role="alert">{{ error }}</p>
			<div class="room-lobby-status" role="status">
				<span class="room-lobby-indicator" aria-hidden="true"></span>
				<div>
					<p class="room-lobby-status-title">{{ isConnected ? 'Room is live' : 'Connecting to the room' }}</p>
					<p class="room-lobby-status-copy">{{ players.length }} {{ players.length === 1 ? 'player' : 'players' }} joined</p>
				</div>
			</div>

			<ul class="room-player-list" aria-label="Players in this room">
				<li v-for="roomPlayer in players" :key="roomPlayer.id">{{ roomPlayer.nickname }}</li>
				<li v-if="players.length === 0" class="room-player-empty">Waiting for players to join</li>
			</ul>

			<div class="room-host-actions">
				<button
					class="auth-submit"
					type="button"
					:disabled="!isConnected || isStarting || players.length === 0 || roomStatus !== 'waiting'"
					@click="startCompetition"
				>
					{{ isStarting ? 'Starting...' : 'Start competition' }}
				</button>
				<RouterLink class="room-host-back" :to="{ name: 'dashboard', query: { view: 'rooms' } }">
					Back to hosted rooms
				</RouterLink>
			</div>
		</section>
	</main>
</template>

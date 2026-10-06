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
} from '../services/game-socket-service'
import { restoreJoinedRoomIdentity } from '../services/joined-room-storage'
import type { JoinedRoomPlayer, RoomPlayerSummary } from '../types/game-session'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const player = ref<JoinedRoomPlayer | null>(null)
const players = ref<RoomPlayerSummary[]>([])
const isConnected = ref(false)
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
		query: { role: 'player' },
	})
}

onMounted(async () => {
	const sessionId = Number(route.params.sessionId)
	const userId = auth.user?.id
	const accessToken = auth.accessToken
	if (!accessToken || !userId) {
		await router.replace({ name: 'login', query: { redirect: route.fullPath } })
		return
	}

	let restoredPlayer: JoinedRoomPlayer | null
	try {
		restoredPlayer = await restoreJoinedRoomIdentity(userId, sessionId, accessToken)
	} catch {
		error.value = 'Unable to restore your room. Please try again.'
		return
	}
	if (!restoredPlayer) {
		await router.replace({ name: 'available-rooms' })
		return
	}
	player.value = restoredPlayer

	socket = createGameSocket(accessToken)
	socket.on('connect', () => {
		isConnected.value = true
		error.value = null
		socket?.emit('join-room', { sessionId, playerId: player.value?.playerId })
	})
	socket.on('disconnect', () => {
		isConnected.value = false
	})
	socket.on('connect_error', () => {
		error.value = 'Connection lost. Reconnecting to the room...'
	})
	socket.on('room-state', (value: unknown) => {
		if (!isRoomSnapshot(value) || value.sessionId !== sessionId || value.role !== 'player') {
			error.value = 'You are not a member of this room.'
			return
		}
		players.value = value.players
		if (value.competition) void showCompetition(value.competition, sessionId)
	})
	socket.on('players-updated', (value: unknown) => {
		if (isRoomPlayerList(value)) players.value = value
	})
	socket.on('competition-started', (value: unknown) => {
		void showCompetition(value, sessionId)
	})
	socket.on('room-error', (value: unknown) => {
		if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
			error.value = value.message
		}
	})
	socket.connect()
})

onUnmounted(() => socket?.disconnect())
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader active="rooms" />
		<section v-if="player" class="dashboard-main room-lobby-main">
			<header class="dashboard-heading room-lobby-heading">
				<p class="dashboard-eyebrow">ROOM {{ player.roomCode }}</p>
				<h1>You're in, {{ player.nickname }}.</h1>
				<p class="dashboard-subtitle">The host will start the quiz when everyone is ready.</p>
			</header>

			<p v-if="error" class="form-error" role="alert">{{ error }}</p>
			<div class="room-lobby-status" role="status">
				<span class="room-lobby-indicator" aria-hidden="true"></span>
				<div>
					<p class="room-lobby-status-title">{{ isConnected ? 'Waiting for the host' : 'Connecting to the room' }}</p>
					<p class="room-lobby-status-copy">{{ players.length }} {{ players.length === 1 ? 'player' : 'players' }} joined</p>
				</div>
			</div>

			<ul class="room-player-list" aria-label="Players in this room">
				<li v-for="roomPlayer in players" :key="roomPlayer.id">{{ roomPlayer.nickname }}</li>
			</ul>

			<RouterLink class="room-lobby-back" :to="{ name: 'dashboard' }">
				Return to dashboard
			</RouterLink>
		</section>
	</main>
</template>

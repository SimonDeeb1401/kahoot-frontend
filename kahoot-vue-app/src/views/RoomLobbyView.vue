<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import type { JoinedRoomPlayer } from '../types/game-session'

const route = useRoute()
const router = useRouter()
const player = ref<JoinedRoomPlayer | null>(null)

function isJoinedRoomPlayer(value: unknown): value is JoinedRoomPlayer {
	if (typeof value !== 'object' || value === null) return false
	const candidate = value as Partial<JoinedRoomPlayer>
	return (
		typeof candidate.playerId === 'number' &&
		typeof candidate.sessionId === 'number' &&
		typeof candidate.roomCode === 'string' &&
		typeof candidate.nickname === 'string'
	)
}

onMounted(async () => {
	const sessionId = Number(route.params.sessionId)
	const storageKey = `kahoot:joined-room:${sessionId}`
	const storedPlayer = sessionStorage.getItem(storageKey)
	if (!storedPlayer) {
		await router.replace({ name: 'available-rooms' })
		return
	}

	try {
		const parsedPlayer: unknown = JSON.parse(storedPlayer)
		if (!isJoinedRoomPlayer(parsedPlayer) || parsedPlayer.sessionId !== sessionId) {
			throw new Error('Invalid joined room data')
		}
		player.value = parsedPlayer
	} catch {
		sessionStorage.removeItem(storageKey)
		await router.replace({ name: 'available-rooms' })
	}
})
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

			<div class="room-lobby-status" role="status">
				<span class="room-lobby-indicator" aria-hidden="true"></span>
				<div>
					<p class="room-lobby-status-title">Waiting for the host</p>
					<p class="room-lobby-status-copy">You joined as {{ player.nickname }}.</p>
				</div>
			</div>

			<RouterLink class="room-lobby-back" :to="{ name: 'dashboard' }">
				Return to dashboard
			</RouterLink>
		</section>
	</main>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import type { JoinableRoom } from '../types/game-session'

const auth = useAuth()
const router = useRouter()
const rooms = ref<JoinableRoom[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

async function loadRooms(): Promise<void> {
	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	isLoading.value = true
	error.value = null
	try {
		rooms.value = await gameSessionService.findJoinable(accessToken)
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to load available rooms.'
	} finally {
		isLoading.value = false
	}
}

onMounted(loadRooms)
</script>

<template>
	<main class="dashboard-page">
		<AuthenticatedHeader active="rooms" />
		<section class="dashboard-main">
			<header class="dashboard-heading">
				<p class="dashboard-eyebrow">OPEN TO JOIN</p>
				<h1>Available rooms</h1>
				<p class="dashboard-subtitle">Choose a room to see its quiz.</p>
			</header>

			<p v-if="isLoading" class="dashboard-message" role="status">Loading available rooms...</p>
			<div v-else-if="error" class="dashboard-error" role="alert">
				<p>{{ error }}</p>
				<button class="dashboard-retry" type="button" @click="loadRooms">Try again</button>
			</div>
			<div v-else-if="rooms.length === 0" class="dashboard-empty">
				<h2>No rooms are open right now</h2>
				<p>Rooms waiting for players will appear here.</p>
			</div>
			<ul v-else class="rooms-grid" aria-label="Available rooms">
				<li v-for="room in rooms" :key="room.id">
					<RouterLink
						class="room-card room-card--link"
						:to="{ name: 'room-quiz', params: { sessionId: room.id } }"
					>
						<p class="room-host">Hosted by {{ room.hostUsername }}</p>
						<h2>{{ room.quiz.title }}</h2>
						<p class="room-description">{{ room.quiz.description || 'No description' }}</p>
						<div class="room-card-footer">
							<span class="room-status room-status--waiting">Waiting for players</span>
							<span class="room-code">{{ room.roomCode }}</span>
						</div>
					</RouterLink>
				</li>
			</ul>
		</section>
	</main>
</template>

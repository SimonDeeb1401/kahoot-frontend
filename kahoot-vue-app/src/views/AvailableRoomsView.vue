<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import AuthenticatedHeader from '../components/common/AuthenticatedHeader.vue'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import { queryKeys } from '../queries/queryKeys'

const auth = useAuth()
const router = useRouter()
const queryClient = useQueryClient()
const roomCode = ref('')
const nickname = ref(auth.user?.username ?? '')
const joinRoomMutation = useMutation({
	mutationFn: ({ roomCode, nickname, accessToken }: {
		roomCode: string
		nickname: string
		userId: number
		accessToken: string
	}) => gameSessionService.join({ roomCode, nickname }, accessToken),
	onSuccess: async (_, { userId }) => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.joinedRooms(userId) })
	},
})
const isSubmitting = joinRoomMutation.isPending
const error = ref<string | null>(null)

async function joinRoom(): Promise<void> {
	if (isSubmitting.value) return
	const accessToken = auth.accessToken
	const userId = auth.user?.id
	if (!accessToken || !userId) {
		await router.replace({ name: 'login' })
		return
	}

	error.value = null
	try {
		const joinedPlayer = await joinRoomMutation.mutateAsync({
			roomCode: roomCode.value.trim().toUpperCase(),
			nickname: nickname.value.trim(),
			accessToken,
			userId,
		})
		sessionStorage.setItem(
			`kahoot:joined-room:${joinedPlayer.sessionId}`,
			JSON.stringify(joinedPlayer),
		)
		await router.push({ name: 'room-lobby', params: { sessionId: joinedPlayer.sessionId } })
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to join this room.'
	}
}
</script>

<template>
	<main class="dashboard-page join-room-page">
		<AuthenticatedHeader active="rooms" />
		<section class="dashboard-main join-room-main">
			<header class="dashboard-heading join-room-heading">
				<p class="dashboard-eyebrow">ROOM ACCESS</p>
				<h1>Join a room</h1>
			</header>

			<form class="auth-form join-room-form" @submit.prevent="joinRoom">
				<div class="form-field">
					<label for="room-code">Room code</label>
					<input
						id="room-code"
						v-model="roomCode"
						name="roomCode"
						type="text"
						maxlength="16"
						pattern="[A-Za-z0-9]{1,16}"
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						required
						@input="roomCode = roomCode.toUpperCase()"
					/>
				</div>
				<div class="form-field">
					<label for="player-nickname">Nickname</label>
					<input
						id="player-nickname"
						v-model.trim="nickname"
						name="nickname"
						type="text"
						maxlength="32"
						autocomplete="nickname"
						required
					/>
				</div>
				<p v-if="error" class="form-error" role="alert">{{ error }}</p>
				<button class="auth-submit" type="submit" :disabled="isSubmitting">
					{{ isSubmitting ? 'Joining room...' : 'Join room' }}
				</button>
			</form>
		</section>
	</main>
</template>

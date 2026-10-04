import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/useAuth'
import { gameSessionService } from '../services/gameSessionService'
import { queryKeys } from './queryKeys'

function useSessionQuery<T>(
	keyForUser: (userId: number) => readonly unknown[],
	fetchRooms: (accessToken: string) => Promise<T[]>,
) {
	const auth = useAuth()
	const userId = computed(() => auth.user?.id)
	const accessToken = computed(() => auth.accessToken)

	return useQuery({
		queryKey: computed(() => keyForUser(userId.value ?? 0)),
		enabled: computed(() => Boolean(userId.value && accessToken.value)),
		queryFn: () => {
			if (!accessToken.value) throw new Error('You must be signed in to load rooms.')
			return fetchRooms(accessToken.value)
		},
	})
}

export function useHostedRoomsQuery() {
	return useSessionQuery(queryKeys.hostedRooms, (accessToken) =>
		gameSessionService.findAll(accessToken),
	)
}

export function useJoinedRoomsQuery() {
	return useSessionQuery(queryKeys.joinedRooms, (accessToken) =>
		gameSessionService.findJoined(accessToken),
	)
}

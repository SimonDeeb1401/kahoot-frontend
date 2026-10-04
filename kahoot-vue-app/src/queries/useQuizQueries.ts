import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/useAuth'
import { quizService } from '../services/quizService'
import { queryKeys } from './queryKeys'

export function useQuizListQuery() {
	const auth = useAuth()
	const userId = computed(() => auth.user?.id)
	const accessToken = computed(() => auth.accessToken)

	return useQuery({
		queryKey: computed(() => queryKeys.quizList(userId.value ?? 0)),
		enabled: computed(() => Boolean(userId.value && accessToken.value)),
		queryFn: () => {
			if (!accessToken.value) throw new Error('You must be signed in to load quizzes.')
			return quizService.findAll(accessToken.value)
		},
	})
}

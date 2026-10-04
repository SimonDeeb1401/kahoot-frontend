import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/useAuth'
import { answerService } from '../services/answerService'
import { questionService } from '../services/questionService'
import { quizService } from '../services/quizService'
import type { Answer } from '../types/answer'
import type { Question } from '../types/question'
import type { Quiz } from '../types/quiz'
import { queryKeys } from './queryKeys'

export interface QuizEditorData {
	quiz: Quiz
	questions: Array<{ question: Question; answers: Answer[] }>
}

export function useQuizEditorQuery(quizId: number) {
	const auth = useAuth()
	const userId = computed(() => auth.user?.id)
	const accessToken = computed(() => auth.accessToken)

	return useQuery<QuizEditorData>({
		queryKey: computed(() => queryKeys.quizEditor(userId.value ?? 0, quizId)),
		enabled: computed(() => Boolean(userId.value && accessToken.value && quizId > 0)),
		queryFn: async () => {
			const token = accessToken.value
			if (!token) throw new Error('You must be signed in to edit a quiz.')

			const [quiz, questions] = await Promise.all([
				quizService.findOne(quizId, token),
				questionService.findAll(quizId, token),
			])
			const questionAnswers = await Promise.all(
				questions.map(async (question) => ({
					question,
					answers: await answerService.findAll(quizId, question.id, token),
				})),
			)

			return { quiz, questions: questionAnswers }
		},
	})
}

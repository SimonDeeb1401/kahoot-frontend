import { ApiError, getJson, postJson } from './api'
import type { CreateQuizInput, Quiz } from '../types/quiz'

function isQuiz(value: unknown): value is Quiz {
	if (typeof value !== 'object' || value === null) return false

	const quiz = value as Partial<Quiz>
	return (
		typeof quiz.id === 'number' &&
		typeof quiz.title === 'string' &&
		(quiz.description === null || typeof quiz.description === 'string') &&
		typeof quiz.creatorId === 'number' &&
		typeof quiz.createdAt === 'string' &&
		typeof quiz.updatedAt === 'string'
	)
}

export const quizService = {
	async findAll(accessToken: string): Promise<Quiz[]> {
		const result = await getJson('/quizzes', accessToken)
		if (!Array.isArray(result) || !result.every(isQuiz)) {
			throw new ApiError('The server returned an unexpected quiz list response.')
		}
		return result
	},

	async create(input: CreateQuizInput, accessToken: string): Promise<Quiz> {
		const result = await postJson('/quizzes', input, accessToken)
		if (!isQuiz(result)) {
			throw new ApiError('The server returned an unexpected quiz response.')
		}
		return result
	},
}

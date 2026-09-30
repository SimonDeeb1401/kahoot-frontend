import { ApiError, deleteJson, getJson, patchJson, postJson } from './api'
import type { CreateQuizInput, Quiz, UpdateQuizInput } from '../types/quiz'

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

	async findOne(id: number, accessToken: string): Promise<Quiz> {
		const result = await getJson(`/quizzes/${id}`, accessToken)
		if (!isQuiz(result)) {
			throw new ApiError('The server returned an unexpected quiz response.')
		}
		return result
	},

	async update(id: number, input: UpdateQuizInput, accessToken: string): Promise<Quiz> {
		const result = await patchJson(`/quizzes/${id}`, input, accessToken)
		if (!isQuiz(result)) {
			throw new ApiError('The server returned an unexpected quiz response.')
		}
		return result
	},

	async remove(id: number, accessToken: string): Promise<void> {
		await deleteJson(`/quizzes/${id}`, accessToken)
	},
}

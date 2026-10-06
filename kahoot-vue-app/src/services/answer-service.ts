import type { Answer, CreateAnswerInput, UpdateAnswerInput } from '../types/answer'
import { ApiError, deleteJson, getJson, patchJson, postJson } from './api'

function isAnswer(value: unknown): value is Answer {
	if (typeof value !== 'object' || value === null) return false
	const answer = value as Partial<Answer>
	return (
		typeof answer.id === 'number' &&
		typeof answer.questionId === 'number' &&
		typeof answer.text === 'string' &&
		typeof answer.isCorrect === 'boolean' &&
		typeof answer.position === 'number'
	)
}

function answersPath(quizId: number, questionId: number): string {
	return `/quizzes/${quizId}/questions/${questionId}/answers`
}

export const answerService = {
	async findAll(quizId: number, questionId: number, accessToken: string): Promise<Answer[]> {
		const result = await getJson(answersPath(quizId, questionId), accessToken)
		if (!Array.isArray(result) || !result.every(isAnswer)) {
			throw new ApiError('The server returned an unexpected answer list response.')
		}
		return result
	},

	async create(quizId: number, questionId: number, input: CreateAnswerInput, accessToken: string): Promise<Answer> {
		const result = await postJson(answersPath(quizId, questionId), input, accessToken)
		if (!isAnswer(result)) throw new ApiError('The server returned an unexpected answer response.')
		return result
	},

	async update(quizId: number, questionId: number, answerId: number, input: UpdateAnswerInput, accessToken: string): Promise<Answer> {
		const result = await patchJson(`${answersPath(quizId, questionId)}/${answerId}`, input, accessToken)
		if (!isAnswer(result)) throw new ApiError('The server returned an unexpected answer response.')
		return result
	},

	remove(quizId: number, questionId: number, answerId: number, accessToken: string): Promise<unknown> {
		return deleteJson(`${answersPath(quizId, questionId)}/${answerId}`, accessToken)
	},
}

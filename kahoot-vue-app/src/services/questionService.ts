import type { CreateQuestionInput, Question, UpdateQuestionInput } from '../types/question'
import { ApiError, deleteJson, getJson, patchJson, postJson } from './api'

function isQuestion(value: unknown): value is Question {
	if (typeof value !== 'object' || value === null) return false
	const question = value as Partial<Question>
	return (
		typeof question.id === 'number' &&
		typeof question.quizId === 'number' &&
		typeof question.text === 'string' &&
		typeof question.position === 'number' &&
		typeof question.timeLimit === 'number' &&
		typeof question.points === 'number'
	)
}

function questionsPath(quizId: number): string {
	return `/quizzes/${quizId}/questions`
}

export const questionService = {
	async findAll(quizId: number, accessToken: string): Promise<Question[]> {
		const result = await getJson(questionsPath(quizId), accessToken)
		if (!Array.isArray(result) || !result.every(isQuestion)) {
			throw new ApiError('The server returned an unexpected question list response.')
		}
		return result
	},

	async create(quizId: number, input: CreateQuestionInput, accessToken: string): Promise<Question> {
		const result = await postJson(questionsPath(quizId), input, accessToken)
		if (!isQuestion(result)) throw new ApiError('The server returned an unexpected question response.')
		return result
	},

	async update(quizId: number, questionId: number, input: UpdateQuestionInput, accessToken: string): Promise<Question> {
		const result = await patchJson(`${questionsPath(quizId)}/${questionId}`, input, accessToken)
		if (!isQuestion(result)) throw new ApiError('The server returned an unexpected question response.')
		return result
	},

	remove(quizId: number, questionId: number, accessToken: string): Promise<unknown> {
		return deleteJson(`${questionsPath(quizId)}/${questionId}`, accessToken)
	},
}

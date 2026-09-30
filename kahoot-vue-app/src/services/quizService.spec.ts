import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { quizService } from './quizService'

const quiz = {
	id: 14,
	title: 'Fractions',
	description: 'A quick review',
	creatorId: 9,
	createdAt: '2026-09-30T10:00:00.000Z',
	updatedAt: '2026-09-30T10:00:00.000Z',
}

function mockFetch(payload: unknown, status = 201) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('quizService', () => {
	it('lists the authenticated user quizzes with the bearer token', async () => {
		const fetchMock = mockFetch([quiz], 200)

		await expect(quizService.findAll('signed-token')).resolves.toEqual([quiz])
		expect(fetchMock).toHaveBeenCalledWith('/quizzes', {
			method: 'GET',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})

	it('rejects an unexpected quiz list response shape', async () => {
		mockFetch({ quizzes: [quiz] }, 200)

		await expect(quizService.findAll('signed-token')).rejects.toBeInstanceOf(ApiError)
	})

	it('posts quiz details with the bearer token and returns the saved quiz', async () => {
		const fetchMock = mockFetch(quiz)
		const input = { title: 'Fractions', description: 'A quick review' }

		await expect(quizService.create(input, 'signed-token')).resolves.toEqual(quiz)
		expect(fetchMock).toHaveBeenCalledWith('/quizzes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

	it('deletes a quiz with the bearer token and accepts a no-content response', async () => {
		const fetchMock = mockFetch(null, 204)

		await expect(quizService.remove(quiz.id, 'signed-token')).resolves.toBeUndefined()
		expect(fetchMock).toHaveBeenCalledWith(`/quizzes/${quiz.id}`, {
			method: 'DELETE',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})

	it('surfaces errors from a failed quiz deletion', async () => {
		mockFetch({ message: 'Quiz not found' }, 404)

		await expect(quizService.remove(quiz.id, 'signed-token')).rejects.toMatchObject({
			name: 'ApiError',
			message: 'Quiz not found',
			status: 404,
		})
	})

	it('rejects an unexpected successful response shape', async () => {
		mockFetch({ id: 14, title: 'Fractions' })

		await expect(
			quizService.create({ title: 'Fractions' }, 'signed-token'),
		).rejects.toBeInstanceOf(ApiError)
	})

	it('surfaces authorization and validation errors from the API', async () => {
		mockFetch({ message: 'Bearer token required' }, 401)

		await expect(
			quizService.create({ title: 'Fractions' }, 'expired-token'),
		).rejects.toMatchObject({
			name: 'ApiError',
			message: 'Bearer token required',
			status: 401,
		})
	})
})

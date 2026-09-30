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

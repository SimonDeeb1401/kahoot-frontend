import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerService } from './answer-service'

const answer = {
	id: 8,
	questionId: 3,
	text: '4',
	isCorrect: true,
	position: 1,
}

function mockFetch(payload: unknown, status = 200) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
	})
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('answerService', () => {
	it('fetches a question answer list with the bearer token', async () => {
		const fetchMock = mockFetch([answer])

		await expect(answerService.findAll(14, 3, 'signed-token')).resolves.toEqual([answer])
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3/answers', {
			method: 'GET',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})

	it('creates an answer with correctness and position', async () => {
		const fetchMock = mockFetch(answer, 201)
		const input = { text: '4', isCorrect: true, position: 1 }

		await expect(answerService.create(14, 3, input, 'signed-token')).resolves.toEqual(answer)
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3/answers', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

	it('patches answer text and correctness', async () => {
		const input = { text: 'four', isCorrect: false }
		const fetchMock = mockFetch({ ...answer, ...input })

		await expect(answerService.update(14, 3, 8, input, 'signed-token')).resolves.toMatchObject(input)
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3/answers/8', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

	it('deletes an answer and accepts a no-content response', async () => {
		const fetchMock = mockFetch(null, 204)

		await expect(answerService.remove(14, 3, 8, 'signed-token')).resolves.toBeNull()
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3/answers/8', {
			method: 'DELETE',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})
})

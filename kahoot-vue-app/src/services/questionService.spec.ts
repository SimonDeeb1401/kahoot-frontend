import { afterEach, describe, expect, it, vi } from 'vitest'
import { questionService } from './questionService'

const question = {
	id: 3,
	quizId: 14,
	text: 'What is 2 + 2?',
	position: 1,
	timeLimit: 30,
	points: 1000,
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

describe('questionService', () => {
	it('fetches ordered questions with the bearer token', async () => {
		const fetchMock = mockFetch([question])

		await expect(questionService.findAll(14, 'signed-token')).resolves.toEqual([question])
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions', {
			method: 'GET',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})

	it('creates a question with its quiz, position, time, and points', async () => {
		const fetchMock = mockFetch(question, 201)
		const input = { text: question.text, position: 1, timeLimit: 30, points: 1000 }

		await expect(questionService.create(14, input, 'signed-token')).resolves.toEqual(question)
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

	it('patches a question by quiz and question id', async () => {
		const input = { text: 'Updated question' }
		const fetchMock = mockFetch({ ...question, ...input })

		await expect(questionService.update(14, 3, input, 'signed-token')).resolves.toMatchObject(input)
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

	it('deletes a question and accepts a no-content response', async () => {
		const fetchMock = mockFetch(null, 204)

		await expect(questionService.remove(14, 3, 'signed-token')).resolves.toBeNull()
		expect(fetchMock).toHaveBeenCalledWith('/quizzes/14/questions/3', {
			method: 'DELETE',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})
})

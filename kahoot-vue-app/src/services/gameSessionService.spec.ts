import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameSessionService } from './gameSessionService'

const session = {
	id: 21,
	quizId: 14,
	hostId: 9,
	roomCode: 'AB12CD',
	status: 'waiting',
	startedAt: null,
	endedAt: null,
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

describe('gameSessionService', () => {
	it('lists hosted rooms with the bearer token', async () => {
		const fetchMock = mockFetch([session])

		await expect(gameSessionService.findAll('signed-token')).resolves.toEqual([session])
		expect(fetchMock).toHaveBeenCalledWith('/game-sessions', {
			method: 'GET',
			headers: { Authorization: 'Bearer signed-token' },
		})
	})

	it('creates a hosted room for the selected quiz', async () => {
		const fetchMock = mockFetch(session, 201)
		const input = { quizId: 14 }

		await expect(gameSessionService.create(input, 'signed-token')).resolves.toEqual(session)
		expect(fetchMock).toHaveBeenCalledWith('/game-sessions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})
})

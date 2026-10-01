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
	it('joins a room by code and nickname with the bearer token', async () => {
		const joinedRoom = {
			playerId: 31,
			sessionId: 24,
			roomCode: 'CD34EF',
			nickname: 'Player One',
		}
		const fetchMock = mockFetch(joinedRoom, 201)
		const input = { roomCode: 'CD34EF', nickname: 'Player One' }

		await expect(gameSessionService.join(input, 'signed-token')).resolves.toEqual(joinedRoom)
		expect(fetchMock).toHaveBeenCalledWith('/game-sessions/join', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer signed-token',
			},
			body: JSON.stringify(input),
		})
	})

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

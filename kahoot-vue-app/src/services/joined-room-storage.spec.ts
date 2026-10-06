import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gameSessionService } from './game-session-service'
import {
	restoreJoinedRoomIdentity,
	saveJoinedRoomIdentity,
} from './joined-room-storage'

vi.mock('./game-session-service', () => ({
	gameSessionService: { findJoined: vi.fn() },
}))

const findJoined = vi.mocked(gameSessionService.findJoined)

beforeEach(() => {
	localStorage.clear()
	sessionStorage.clear()
	vi.clearAllMocks()
})

describe('joined room identity storage', () => {
	it('keeps different users in the same room mapped to their own player IDs', async () => {
		const firstPlayer = {
			playerId: 31,
			sessionId: 24,
			roomCode: 'CD34EF',
			nickname: 'Player One',
		}
		const secondPlayer = { ...firstPlayer, playerId: 32, nickname: 'Player Two' }
		saveJoinedRoomIdentity(101, firstPlayer)
		saveJoinedRoomIdentity(202, secondPlayer)

		await expect(restoreJoinedRoomIdentity(101, 24, 'first-token')).resolves.toEqual(firstPlayer)
		await expect(restoreJoinedRoomIdentity(202, 24, 'second-token')).resolves.toEqual(secondPlayer)
		expect(findJoined).not.toHaveBeenCalled()
	})

	it('rebuilds missing local identity from the authenticated joined-room list', async () => {
		const joinedRoom = {
			playerId: 45,
			sessionId: 24,
			roomCode: 'CD34EF',
			nickname: 'Player Three',
			status: 'active',
			quizTitle: 'Quiz title',
		}
		findJoined.mockResolvedValue([joinedRoom])

		await expect(restoreJoinedRoomIdentity(303, 24, 'signed-token')).resolves.toEqual({
			playerId: 45,
			sessionId: 24,
			roomCode: 'CD34EF',
			nickname: 'Player Three',
		})
		expect(findJoined).toHaveBeenCalledWith('signed-token')
	})
})

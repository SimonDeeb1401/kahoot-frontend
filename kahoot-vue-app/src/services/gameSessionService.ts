import type { CreateGameSessionInput, GameSession } from '../types/game-session'
import { ApiError, getJson, postJson } from './api'

function isGameSession(value: unknown): value is GameSession {
	if (typeof value !== 'object' || value === null) return false
	const session = value as Partial<GameSession>
	return (
		typeof session.id === 'number' &&
		typeof session.quizId === 'number' &&
		typeof session.hostId === 'number' &&
		typeof session.roomCode === 'string' &&
		typeof session.status === 'string' &&
		(session.startedAt === null || typeof session.startedAt === 'string') &&
		(session.endedAt === null || typeof session.endedAt === 'string')
	)
}

export const gameSessionService = {
	async findAll(accessToken: string): Promise<GameSession[]> {
		const result = await getJson('/game-sessions', accessToken)
		if (!Array.isArray(result) || !result.every(isGameSession)) {
			throw new ApiError('The server returned an unexpected room list response.')
		}
		return result
	},

	async create(input: CreateGameSessionInput, accessToken: string): Promise<GameSession> {
		const result = await postJson('/game-sessions', input, accessToken)
		if (!isGameSession(result)) {
			throw new ApiError('The server returned an unexpected room response.')
		}
		return result
	},
}

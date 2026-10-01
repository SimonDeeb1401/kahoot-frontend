import type {
	CreateGameSessionInput,
	GameSession,
	JoinGameSessionInput,
	JoinedRoomPlayer,
	JoinedRoomSummary,
} from '../types/game-session'
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

	async findJoined(accessToken: string): Promise<JoinedRoomSummary[]> {
		const result = await getJson('/game-sessions/joined', accessToken)
		const isJoinedRoomSummary = (value: unknown): value is JoinedRoomSummary => {
			if (typeof value !== 'object' || value === null) return false
			const room = value as Partial<JoinedRoomSummary>
			return (
				typeof room.playerId === 'number' &&
				typeof room.sessionId === 'number' &&
				typeof room.roomCode === 'string' &&
				typeof room.nickname === 'string' &&
				typeof room.status === 'string' &&
				typeof room.quizTitle === 'string'
			)
		}
		if (!Array.isArray(result) || !result.every(isJoinedRoomSummary)) {
			throw new ApiError('The server returned an unexpected joined room list response.')
		}
		return result
	},

	async join(input: JoinGameSessionInput, accessToken: string): Promise<JoinedRoomPlayer> {
		const result = await postJson('/game-sessions/join', input, accessToken)
		if (
			typeof result !== 'object' ||
			result === null ||
			typeof (result as Partial<JoinedRoomPlayer>).playerId !== 'number' ||
			typeof (result as Partial<JoinedRoomPlayer>).sessionId !== 'number' ||
			typeof (result as Partial<JoinedRoomPlayer>).roomCode !== 'string' ||
			typeof (result as Partial<JoinedRoomPlayer>).nickname !== 'string'
		) {
			throw new ApiError('The server returned an unexpected room join response.')
		}
		return result as JoinedRoomPlayer
	},

	async create(input: CreateGameSessionInput, accessToken: string): Promise<GameSession> {
		const result = await postJson('/game-sessions', input, accessToken)
		if (!isGameSession(result)) {
			throw new ApiError('The server returned an unexpected room response.')
		}
		return result
	},
}

import type {
	CreateGameSessionInput,
	GameSession,
	JoinableRoom,
	JoinableRoomDetails,
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

function isJoinableRoom(value: unknown): value is JoinableRoom {
	if (typeof value !== 'object' || value === null) return false
	const room = value as Partial<JoinableRoom>
	if (
		typeof room.id !== 'number' ||
		typeof room.roomCode !== 'string' ||
		typeof room.hostUsername !== 'string' ||
		typeof room.quiz !== 'object' ||
		room.quiz === null
	) {
		return false
	}
	return (
		typeof room.quiz.id === 'number' &&
		typeof room.quiz.title === 'string' &&
		(room.quiz.description === null || typeof room.quiz.description === 'string')
	)
}

function isJoinableRoomDetails(value: unknown): value is JoinableRoomDetails {
	if (!isJoinableRoom(value)) return false
	const quiz = (value as JoinableRoomDetails).quiz
	return (
		Array.isArray(quiz.questions) &&
		quiz.questions.every(
			(question) =>
				typeof question.id === 'number' &&
				typeof question.text === 'string' &&
				typeof question.timeLimit === 'number' &&
				typeof question.points === 'number' &&
				Array.isArray(question.answers) &&
				question.answers.every(
					(answer) => typeof answer.id === 'number' && typeof answer.text === 'string',
				),
		)
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

	async findJoinable(accessToken: string): Promise<JoinableRoom[]> {
		const result = await getJson('/game-sessions/available', accessToken)
		if (!Array.isArray(result) || !result.every(isJoinableRoom)) {
			throw new ApiError('The server returned an unexpected available room list response.')
		}
		return result
	},

	async findJoinableOne(id: number, accessToken: string): Promise<JoinableRoomDetails> {
		const result = await getJson(`/game-sessions/available/${id}`, accessToken)
		if (!isJoinableRoomDetails(result)) {
			throw new ApiError('The server returned an unexpected room preview response.')
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

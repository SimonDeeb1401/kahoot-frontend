import { io, type Socket } from 'socket.io-client'
import type {
	CompetitionQuiz,
	RoomPlayerSummary,
	RoomSnapshot,
} from '../types/game-session'

function isRoomPlayerSummary(value: unknown): value is RoomPlayerSummary {
	if (typeof value !== 'object' || value === null) return false
	const player = value as Partial<RoomPlayerSummary>
	return typeof player.id === 'number' && typeof player.nickname === 'string'
}

export function isRoomPlayerList(value: unknown): value is RoomPlayerSummary[] {
	return Array.isArray(value) && value.every(isRoomPlayerSummary)
}

export function isCompetitionQuiz(value: unknown): value is CompetitionQuiz {
	if (typeof value !== 'object' || value === null) return false
	const competition = value as Partial<CompetitionQuiz>
	if (
		typeof competition.sessionId !== 'number' ||
		typeof competition.roomCode !== 'string' ||
		typeof competition.quiz !== 'object' ||
		competition.quiz === null
	) {
		return false
	}

	const { quiz } = competition
	return (
		typeof quiz.id === 'number' &&
		typeof quiz.title === 'string' &&
		(quiz.description === null || typeof quiz.description === 'string') &&
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

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
	if (typeof value !== 'object' || value === null) return false
	const snapshot = value as Partial<RoomSnapshot>
	return (
		typeof snapshot.sessionId === 'number' &&
		typeof snapshot.roomCode === 'string' &&
		typeof snapshot.status === 'string' &&
		(snapshot.role === 'host' || snapshot.role === 'player') &&
		Array.isArray(snapshot.players) &&
		snapshot.players.every(isRoomPlayerSummary) &&
		(snapshot.competition === null || isCompetitionQuiz(snapshot.competition))
	)
}

export function createGameSocket(accessToken: string): Socket {
	const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
	const socketOrigin = configuredApiUrl
		? new URL(configuredApiUrl, window.location.origin).origin
		: undefined
	return io(socketOrigin, {
		autoConnect: false,
		auth: { token: accessToken },
	})
}

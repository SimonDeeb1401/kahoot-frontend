import { io, type Socket } from 'socket.io-client'
import type {
	AnswerFeedback,
	AnswerProgress,
	CompetitionFinished,
	CompetitionQuiz,
	LeaderboardEntry,
	QuestionDelivery,
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

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
	return (
		isRoomPlayerSummary(value) &&
		typeof (value as Partial<LeaderboardEntry>).score === 'number'
	)
}

export function isCompetitionFinished(value: unknown): value is CompetitionFinished {
	if (typeof value !== 'object' || value === null) return false
	const finished = value as Partial<CompetitionFinished>
	return (
		typeof finished.sessionId === 'number' &&
		Array.isArray(finished.leaderboard) &&
		finished.leaderboard.every(isLeaderboardEntry)
	)
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
		(snapshot.competition === null || isCompetitionQuiz(snapshot.competition)) &&
		(snapshot.leaderboard === null ||
			(Array.isArray(snapshot.leaderboard) && snapshot.leaderboard.every(isLeaderboardEntry)))
	)
}

export function isQuestionDelivery(value: unknown): value is QuestionDelivery {
	if (typeof value !== 'object' || value === null) return false
	const delivery = value as Partial<QuestionDelivery>
	return (
		typeof delivery.sessionId === 'number' &&
		typeof delivery.questionNumber === 'number' &&
		typeof delivery.totalQuestions === 'number' &&
		typeof delivery.endsAt === 'string' &&
		typeof delivery.question === 'object' &&
		delivery.question !== null &&
		typeof delivery.question.id === 'number' &&
		typeof delivery.question.text === 'string' &&
		typeof delivery.question.timeLimit === 'number' &&
		typeof delivery.question.points === 'number' &&
		Array.isArray(delivery.question.answers) &&
		delivery.question.answers.every(
			(answer) => typeof answer.id === 'number' && typeof answer.text === 'string',
		)
	)
}

export function isAnswerProgress(value: unknown): value is AnswerProgress {
	if (typeof value !== 'object' || value === null) return false
	const progress = value as Partial<AnswerProgress>
	return (
		typeof progress.sessionId === 'number' &&
		typeof progress.questionId === 'number' &&
		typeof progress.answeredCount === 'number' &&
		typeof progress.totalPlayers === 'number' &&
		Array.isArray(progress.answerCounts) &&
		progress.answerCounts.every(
			(answer) =>
				typeof answer.answerId === 'number' && typeof answer.count === 'number',
		)
	)
}

export function isAnswerFeedback(value: unknown): value is AnswerFeedback {
	if (typeof value !== 'object' || value === null) return false
	const feedback = value as Partial<AnswerFeedback>
	return (
		typeof feedback.sessionId === 'number' &&
		typeof feedback.questionId === 'number' &&
		typeof feedback.selectedAnswerId === 'number' &&
		typeof feedback.correctAnswerId === 'number' &&
		typeof feedback.isCorrect === 'boolean' &&
		typeof feedback.pointsAwarded === 'number' &&
		typeof feedback.totalScore === 'number'
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

export interface CreateGameSessionInput {
	quizId: number
	roomCode?: string
}

export interface GameSession {
	id: number
	quizId: number
	hostId: number
	roomCode: string
	status: string
	startedAt: string | null
	endedAt: string | null
}

export interface JoinGameSessionInput {
	roomCode: string
	nickname: string
}

export interface JoinedRoomPlayer {
	playerId: number
	sessionId: number
	roomCode: string
	nickname: string
}

export interface JoinedRoomSummary extends JoinedRoomPlayer {
	status: string
	quizTitle: string
}

export interface RoomPlayerSummary {
	id: number
	nickname: string
}

export interface CompetitionQuiz {
	sessionId: number
	roomCode: string
	quiz: {
		id: number
		title: string
		description: string | null
		questions: Array<{
			id: number
			text: string
			timeLimit: number
			points: number
			answers: Array<{ id: number; text: string }>
		}>
	}
}

export interface RoomSnapshot {
	sessionId: number
	roomCode: string
	status: string
	role: 'host' | 'player'
	players: RoomPlayerSummary[]
	competition: CompetitionQuiz | null
}

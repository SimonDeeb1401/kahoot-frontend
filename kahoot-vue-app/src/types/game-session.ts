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

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

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

export interface JoinableRoom {
	id: number
	roomCode: string
	hostUsername: string
	quiz: {
		id: number
		title: string
		description: string | null
	}
}

export interface JoinableRoomDetails extends JoinableRoom {
	quiz: JoinableRoom['quiz'] & {
		questions: Array<{
			id: number
			text: string
			timeLimit: number
			points: number
			answers: Array<{ id: number; text: string }>
		}>
	}
}

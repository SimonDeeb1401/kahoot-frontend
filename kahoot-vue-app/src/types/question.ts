export interface CreateQuestionInput {
	text: string
	position: number
	timeLimit: number
	points: number
}

export interface UpdateQuestionInput {
	text?: string
	position?: number
	timeLimit?: number
	points?: number
}

export interface Question extends CreateQuestionInput {
	id: number
	quizId: number
}

export interface CreateAnswerInput {
	text: string
	isCorrect: boolean
	position: number
}

export interface UpdateAnswerInput {
	text?: string
	isCorrect?: boolean
	position?: number
}

export interface Answer extends CreateAnswerInput {
	id: number
	questionId: number
}

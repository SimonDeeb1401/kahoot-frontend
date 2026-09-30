export interface CreateQuizInput {
	title: string
	description?: string
}

export interface UpdateQuizInput {
	title?: string
	description?: string | null
}

export interface Quiz {
	id: number
	title: string
	description: string | null
	creatorId: number
	createdAt: string
	updatedAt: string
}

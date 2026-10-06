export const queryKeys = {
	quizList: (userId: number) => ['quizzes', userId, 'list'] as const,
	quizEditor: (userId: number, quizId: number) => ['quiz-editor', userId, quizId] as const,
	hostedRooms: (userId: number) => ['game-sessions', userId, 'hosted'] as const,
	joinedRooms: (userId: number) => ['game-sessions', userId, 'joined'] as const,
}

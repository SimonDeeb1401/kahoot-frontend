<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Plus, Trash2 } from '@lucide/vue'
import { useAuth } from '../composables/useAuth'
import { answerService } from '../services/answer-service'
import { questionService } from '../services/question-service'
import { quizService } from '../services/quiz-service'
import { queryKeys } from '../queries/query-keys'
import { useQuizEditorQuery } from '../queries/useQuizEditorQuery'
import type { Answer } from '../types/answer'
import type { Question } from '../types/question'

interface AnswerDraft {
	key: number
	id?: number
	text: string
	isCorrect: boolean
	position: number
}

interface QuestionDraft {
	key: number
	id?: number
	text: string
	position: number
	timeLimit: number
	points: number
	answers: AnswerDraft[]
	isSaving: boolean
	isDeleting: boolean
	error: string | null
	success: string | null
}

let nextDraftKey = 0
const auth = useAuth()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const quizId = Number(route.params.quizId)
const editorQuery = useQuizEditorQuery(quizId)
const isLoading = editorQuery.isLoading
const loadError = computed(() =>
	editorQuery.error.value instanceof Error ? editorQuery.error.value.message : null,
)
const title = ref('')
const description = ref('')
const questions = ref<QuestionDraft[]>([])
const detailsError = ref<string | null>(null)
const detailsSaved = ref(false)
const pageNotice = ref<string | null>(null)

function getAccessToken(): string | null {
	return auth.accessToken
}

function asAnswerDraft(answer: Answer): AnswerDraft {
	return {
		key: ++nextDraftKey,
		id: answer.id,
		text: answer.text,
		isCorrect: answer.isCorrect,
		position: answer.position,
	}
}

function asQuestionDraft(question: Question, answers: Answer[]): QuestionDraft {
	return {
		key: ++nextDraftKey,
		id: question.id,
		text: question.text,
		position: question.position,
		timeLimit: question.timeLimit,
		points: question.points,
		answers: answers.map(asAnswerDraft),
		isSaving: false,
		isDeleting: false,
		error: null,
		success: null,
	}
}

function createAnswerDraft(position: number, isCorrect = false): AnswerDraft {
	return { key: ++nextDraftKey, text: '', isCorrect, position }
}

function createQuestionDraft(): QuestionDraft {
	const position = questions.value.reduce((highest, item) => Math.max(highest, item.position), 0) + 1
	return {
		key: ++nextDraftKey,
		text: '',
		position,
		timeLimit: 30,
		points: 1000,
		answers: [createAnswerDraft(1, true), createAnswerDraft(2)],
		isSaving: false,
		isDeleting: false,
		error: null,
		success: null,
	}
}

const updateQuizMutation = useMutation({
	mutationFn: ({ input, accessToken }: {
		input: { title: string; description: string | null }
		userId: number
		accessToken: string
	}) => quizService.update(quizId, input, accessToken),
	onSuccess: async (_, { userId }) => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.quizList(userId) }),
			queryClient.invalidateQueries({ queryKey: queryKeys.quizEditor(userId, quizId) }),
		])
	},
})
const isSavingDetails = updateQuizMutation.isPending

type QuestionWriteInput = Pick<Question, 'text' | 'position' | 'timeLimit' | 'points'>

const writeQuestionMutation = useMutation({
	mutationFn: ({ question, accessToken }: {
		question: QuestionDraft
		accessToken: string
	}) => {
		const input: QuestionWriteInput = {
			text: question.text.trim(),
			position: question.position,
			timeLimit: Number(question.timeLimit),
			points: Number(question.points),
		}
		return question.id
			? questionService.update(quizId, question.id, input, accessToken)
			: questionService.create(quizId, input, accessToken)
	},
})

const writeAnswerMutation = useMutation({
	mutationFn: ({ questionId, answer, position, accessToken }: {
		questionId: number
		answer: AnswerDraft
		position: number
		accessToken: string
	}) => {
		const input = { text: answer.text.trim(), isCorrect: answer.isCorrect, position }
		return answer.id
			? answerService.update(quizId, questionId, answer.id, input, accessToken)
			: answerService.create(quizId, questionId, input, accessToken)
	},
})

const deleteQuestionMutation = useMutation({
	mutationFn: ({ question, accessToken }: {
		question: QuestionDraft
		userId: number
		accessToken: string
	}) => {
		if (!question.id) throw new Error('Question has not been saved.')
		return questionService.remove(quizId, question.id, accessToken)
	},
	onSuccess: async (_, { userId }) => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.quizEditor(userId, quizId) })
	},
})

const deleteAnswerMutation = useMutation({
	mutationFn: ({ questionId, answerId, accessToken }: {
		questionId: number
		answerId: number
		userId: number
		accessToken: string
	}) => answerService.remove(quizId, questionId, answerId, accessToken),
	onSuccess: async (_, { userId }) => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.quizEditor(userId, quizId) })
	},
})

let draftsHydrated = false
watch(editorQuery.data, (data) => {
	if (!data || draftsHydrated) return
	draftsHydrated = true
	title.value = data.quiz.title
	description.value = data.quiz.description ?? ''
	questions.value = data.questions.map(({ question, answers }) => asQuestionDraft(question, answers))
}, { immediate: true })

onMounted(async () => {
	if (!auth.accessToken) {
		await router.replace({ name: 'login' })
		return
	}
	if (!Number.isInteger(quizId) || quizId < 1) await router.replace({ name: 'dashboard' })
})

async function saveDetails(): Promise<void> {
	const trimmedTitle = title.value.trim()
	if (!trimmedTitle) {
		detailsError.value = 'Enter a title for your quiz.'
		return
	}
	const accessToken = getAccessToken()
	const userId = auth.user?.id
	if (!accessToken || !userId) {
		await router.replace({ name: 'login' })
		return
	}

	detailsError.value = null
	detailsSaved.value = false
	try {
		const updatedQuiz = await updateQuizMutation.mutateAsync({
			input: { title: trimmedTitle, description: description.value.trim() || null },
			accessToken,
			userId,
		})
		title.value = updatedQuiz.title
		description.value = updatedQuiz.description ?? ''
		detailsSaved.value = true
	} catch (cause) {
		detailsError.value = cause instanceof Error ? cause.message : 'Unable to save quiz details.'
	}
}

function addQuestion(): void {
	pageNotice.value = null
	questions.value.push(createQuestionDraft())
}

function addAnswer(question: QuestionDraft): void {
	question.success = null
	question.answers.push(createAnswerDraft(question.answers.length + 1))
}

function selectCorrectAnswer(question: QuestionDraft, selectedAnswer: AnswerDraft): void {
	for (const answer of question.answers) answer.isCorrect = answer.key === selectedAnswer.key
}

async function saveQuestion(question: QuestionDraft): Promise<void> {
	if (question.isSaving) return
	const accessToken = getAccessToken()
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	const trimmedText = question.text.trim()
	if (!trimmedText) {
		question.error = 'Enter the question text.'
		return
	}
	if (question.answers.length < 2 || question.answers.some((answer) => !answer.text.trim())) {
		question.error = 'Add at least two answers and fill in each answer.'
		return
	}
	if (!question.answers.some((answer) => answer.isCorrect)) {
		question.error = 'Choose the correct answer.'
		return
	}
	const userId = auth.user?.id
	if (!userId) {
		await router.replace({ name: 'login' })
		return
	}

	question.isSaving = true
	question.error = null
	question.success = null
	try {
		const savedQuestion = await writeQuestionMutation.mutateAsync({ question, accessToken })
		question.id = savedQuestion.id
		question.text = savedQuestion.text

		for (let index = 0; index < question.answers.length; index += 1) {
			const answer = question.answers[index]
			if (!answer) continue
			const savedAnswer = await writeAnswerMutation.mutateAsync({
				questionId: question.id,
				answer,
				position: index + 1,
				accessToken,
			})
			Object.assign(answer, savedAnswer)
		}
		await queryClient.invalidateQueries({ queryKey: queryKeys.quizEditor(userId, quizId) })
		question.success = 'Question and answers saved.'
	} catch (cause) {
		question.error = cause instanceof Error ? cause.message : 'Unable to save this question.'
	} finally {
		question.isSaving = false
	}
}

async function deleteQuestion(question: QuestionDraft): Promise<void> {
	if (question.isDeleting || question.isSaving) return
	if (!window.confirm(`Delete question ${question.position}? This cannot be undone.`)) return

	const accessToken = getAccessToken()
	const userId = auth.user?.id
	if (question.id && (!accessToken || !userId)) {
		await router.replace({ name: 'login' })
		return
	}

	question.isDeleting = true
	question.error = null
	try {
		if (question.id && accessToken) {
			await deleteQuestionMutation.mutateAsync({ question, accessToken, userId: userId! })
		}
		questions.value = questions.value.filter((item) => item.key !== question.key)
		pageNotice.value = 'Question deleted.'
	} catch (cause) {
		question.error = cause instanceof Error ? cause.message : 'Unable to delete this question.'
	} finally {
		question.isDeleting = false
	}
}

async function deleteAnswer(question: QuestionDraft, answer: AnswerDraft): Promise<void> {
	if (!window.confirm('Delete this answer? This cannot be undone.')) return
	const accessToken = getAccessToken()
	const userId = auth.user?.id
	if (answer.id && (!question.id || !accessToken || !userId)) {
		await router.replace({ name: 'login' })
		return
	}

	question.error = null
	try {
		if (answer.id && question.id && accessToken && userId) {
			await deleteAnswerMutation.mutateAsync({
				questionId: question.id,
				answerId: answer.id,
				accessToken,
				userId,
			})
		}
		question.answers = question.answers.filter((item) => item.key !== answer.key)
		question.answers.forEach((item, index) => (item.position = index + 1))
	} catch (cause) {
		question.error = cause instanceof Error ? cause.message : 'Unable to delete this answer.'
	}
}
</script>

<template>
	<main class="quiz-editor-page">
		<nav class="quiz-editor-nav" aria-label="Quiz navigation">
			<RouterLink :to="{ name: 'dashboard' }">Back to my quizzes</RouterLink>
		</nav>

		<section v-if="isLoading" class="quiz-editor-main" aria-live="polite">
			<p class="dashboard-message">Loading quiz...</p>
		</section>
		<section v-else-if="loadError" class="quiz-editor-main" aria-labelledby="editor-error-title">
			<h1 id="editor-error-title">Unable to open quiz</h1>
			<p class="form-error" role="alert">{{ loadError }}</p>
			<button class="dashboard-retry" type="button" @click="editorQuery.refetch()">Try again</button>
			<RouterLink class="auth-switch-link" :to="{ name: 'dashboard' }">Return to my quizzes</RouterLink>
		</section>
		<section v-else class="quiz-editor-main" aria-labelledby="editor-title">
			<header class="quiz-editor-heading">
				<p class="dashboard-eyebrow">QUIZ EDITOR</p>
				<h1 id="editor-title">{{ title || 'Edit quiz' }}</h1>
			</header>

			<p v-if="pageNotice" class="form-notice" role="status">{{ pageNotice }}</p>
			<p v-if="detailsError" class="form-error" role="alert">{{ detailsError }}</p>
			<p v-if="detailsSaved" class="form-notice" role="status">Quiz details saved.</p>

			<form class="quiz-details-form" @submit.prevent="saveDetails">
				<div class="form-field">
					<label for="edit-quiz-title">Title</label>
					<input
						id="edit-quiz-title"
						v-model="title"
						name="title"
						type="text"
						maxlength="255"
						required
						@input="detailsSaved = false"
					/>
				</div>
				<div class="form-field">
					<label for="edit-quiz-description">Description <span>(optional)</span></label>
					<textarea
						id="edit-quiz-description"
						v-model="description"
						name="description"
						rows="3"
						maxlength="10000"
					></textarea>
				</div>
				<div class="quiz-details-actions">
					<button class="auth-submit" type="submit" :disabled="isSavingDetails">
						{{ isSavingDetails ? 'Saving...' : 'Save details' }}
					</button>
				</div>
			</form>

			<div class="questions-heading">
				<div>
					<h2>Questions</h2>
					<p>Write each question, add answer choices, and mark the correct one.</p>
				</div>
				<button class="editor-add-button" type="button" @click="addQuestion">
					<Plus :size="17" aria-hidden="true" />
					Add question
				</button>
			</div>

			<p v-if="questions.length === 0" class="dashboard-empty editor-empty">
				No questions yet. Add one to start building your quiz.
			</p>

			<article v-for="question in questions" :key="question.key" class="question-editor">
				<header class="question-editor-heading">
					<h3>Question {{ question.position }}</h3>
					<button
						class="quiz-delete-button"
						type="button"
						:aria-label="`Delete question ${question.position}`"
						:title="`Delete question ${question.position}`"
						:disabled="question.isDeleting || question.isSaving"
						@click="deleteQuestion(question)"
					>
						<Trash2 :size="17" aria-hidden="true" />
					</button>
				</header>

				<p v-if="question.error" class="form-error" role="alert">{{ question.error }}</p>
				<p v-if="question.success" class="form-notice" role="status">{{ question.success }}</p>

				<div class="question-fields">
					<div class="form-field question-text-field">
						<label :for="`question-text-${question.key}`">Question text</label>
						<textarea
							:id="`question-text-${question.key}`"
							v-model="question.text"
							maxlength="10000"
							rows="2"
							required
							@input="question.success = null"
						></textarea>
					</div>
					<div class="question-settings">
						<div class="form-field">
							<label :for="`question-time-${question.key}`">Time limit (seconds)</label>
							<input :id="`question-time-${question.key}`" v-model.number="question.timeLimit" type="number" min="1" required />
						</div>
						<div class="form-field">
							<label :for="`question-points-${question.key}`">Points</label>
							<input :id="`question-points-${question.key}`" v-model.number="question.points" type="number" min="0" required />
						</div>
					</div>
				</div>

				<fieldset class="answer-editor-list">
					<legend>Answer choices <span>Choose one correct answer</span></legend>
					<div v-for="(answer, index) in question.answers" :key="answer.key" class="answer-editor-row">
						<div class="form-field answer-text-field">
							<label :for="`answer-text-${answer.key}`">Answer {{ index + 1 }}</label>
							<input
								:id="`answer-text-${answer.key}`"
								v-model="answer.text"
								maxlength="2000"
								required
								@input="question.success = null"
							/>
						</div>
						<label class="correct-answer-toggle">
							<input
								type="radio"
								:name="`correct-answer-${question.key}`"
								:checked="answer.isCorrect"
								:aria-label="`Mark answer ${index + 1} correct`"
								@change="selectCorrectAnswer(question, answer)"
							/>
							Correct
						</label>
						<button
							class="quiz-delete-button answer-delete-button"
							type="button"
							:aria-label="`Delete answer ${index + 1}`"
							:title="`Delete answer ${index + 1}`"
							:disabled="question.isSaving"
							@click="deleteAnswer(question, answer)"
						>
							<Trash2 :size="15" aria-hidden="true" />
						</button>
					</div>
				</fieldset>

				<div class="question-editor-actions">
					<button class="editor-add-button editor-add-answer" type="button" :disabled="question.isSaving" @click="addAnswer(question)">
						<Plus :size="16" aria-hidden="true" />
						Add answer
					</button>
					<button class="auth-submit" type="button" :disabled="question.isSaving || question.isDeleting" @click="saveQuestion(question)">
						{{ question.isSaving ? 'Saving question...' : 'Save question' }}
					</button>
				</div>
			</article>
		</section>
	</main>
</template>

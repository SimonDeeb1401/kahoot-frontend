<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '../components/common/AuthLayout.vue'
import { useAuth } from '../composables/useAuth'
import { quizService } from '../services/quizService'

const auth = useAuth()
const router = useRouter()
const title = ref('')
const description = ref('')
const isSubmitting = ref(false)
const error = ref<string | null>(null)

async function submit(): Promise<void> {
	if (isSubmitting.value) return

	const trimmedTitle = title.value.trim()
	if (!trimmedTitle) {
		error.value = 'Enter a title for your quiz.'
		return
	}

	const accessToken = auth.accessToken
	if (!accessToken) {
		await router.replace({ name: 'login' })
		return
	}

	isSubmitting.value = true
	error.value = null

	try {
		await quizService.create(
			{
				title: trimmedTitle,
				description: description.value.trim() || undefined,
			},
			accessToken,
		)
		await router.replace({ name: 'dashboard', query: { created: '1' } })
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : 'Unable to create the quiz. Please try again.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<AuthLayout>
		<header class="auth-heading">
			<p class="auth-eyebrow">NEW QUIZ</p>
			<h2>Create a quiz</h2>
			<p class="auth-subtitle">Give your quiz a title and a short description.</p>
		</header>

		<p v-if="error" class="form-error" role="alert">{{ error }}</p>

		<form class="auth-form" @submit.prevent="submit">
			<div class="form-field">
				<label for="quiz-title">Title</label>
				<input
					id="quiz-title"
					v-model="title"
					autocomplete="off"
					name="title"
					type="text"
					placeholder="e.g. The solar system"
					maxlength="255"
					required
					@input="error = null"
				/>
			</div>

			<div class="form-field">
				<label for="quiz-description">Description <span>(optional)</span></label>
				<textarea
					id="quiz-description"
					v-model="description"
					name="description"
					rows="4"
					maxlength="10000"
					placeholder="What will players learn?"
					@input="error = null"
				></textarea>
			</div>

			<button class="auth-submit" type="submit" :disabled="isSubmitting">
				{{ isSubmitting ? 'Creating quiz...' : 'Create quiz' }}
			</button>
		</form>

		<p class="auth-switch">
			<RouterLink :to="{ name: 'dashboard' }">Cancel and return to dashboard</RouterLink>
		</p>
	</AuthLayout>
</template>
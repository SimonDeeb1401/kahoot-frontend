import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '../services/authService'
import type { AuthUser, LoginCredentials, SignupCredentials } from '../types/user'
import { queryClient } from '../queries/queryClient'

export const useAuthStore = defineStore('auth', () => {
	const user = ref<AuthUser | null>(null)
	const accessToken = ref<string | null>(null)
	const isLoading = ref(false)
	const error = ref<string | null>(null)
	const isAuthenticated = computed(() => Boolean(user.value && accessToken.value))

	async function login(credentials: LoginCredentials): Promise<boolean> {
		if (isLoading.value) return false

		isLoading.value = true
		error.value = null

		try {
			const response = await authService.login(credentials)
			queryClient.clear()
			user.value = response.user
			accessToken.value = response.accessToken
			return true
		} catch (cause) {
			error.value = cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.'
			return false
		} finally {
			isLoading.value = false
		}
	}

	async function signup(credentials: SignupCredentials): Promise<boolean> {
		if (isLoading.value) return false

		isLoading.value = true
		error.value = null

		try {
			await authService.signup(credentials)
			return true
		} catch (cause) {
			error.value = cause instanceof Error ? cause.message : 'Unable to create your account. Please try again.'
			return false
		} finally {
			isLoading.value = false
		}
	}

	function clearError(): void {
		error.value = null
	}

	function logout(): void {
		queryClient.clear()
		user.value = null
		accessToken.value = null
		error.value = null
	}

	return { user, accessToken, isLoading, error, isAuthenticated, login, signup, clearError, logout }
})

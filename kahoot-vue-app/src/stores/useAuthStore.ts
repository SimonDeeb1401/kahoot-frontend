import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '../services/auth-service'
import type { AuthUser, LoginCredentials, SignupCredentials } from '../types/user'
import { queryClient } from '../queries/query-client'

export const useAuthStore = defineStore('auth', () => {
	const user = ref<AuthUser | null>(null)
	const accessToken = ref<string | null>(null)
	const isLoading = ref(false)
	const error = ref<string | null>(null)
	const sessionInitialized = ref(false)
	const isAuthenticated = computed(() => Boolean(user.value && accessToken.value))
	let restorePromise: Promise<void> | undefined

	async function restoreSession(): Promise<void> {
		if (sessionInitialized.value) return

		restorePromise ??= (async () => {
			try {
				const response = await authService.refresh()
				user.value = response.user
				accessToken.value = response.accessToken
			} catch {
				user.value = null
				accessToken.value = null
			} finally {
				sessionInitialized.value = true
			}
		})()

		await restorePromise
	}

	async function login(credentials: LoginCredentials): Promise<boolean> {
		if (isLoading.value) return false

		isLoading.value = true
		error.value = null

		try {
			const response = await authService.login(credentials)
			queryClient.clear()
			user.value = response.user
			accessToken.value = response.accessToken
			sessionInitialized.value = true
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
			const response = await authService.signup(credentials)
			queryClient.clear()
			user.value = response.user
			accessToken.value = response.accessToken
			sessionInitialized.value = true
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

	async function logout(): Promise<void> {
		queryClient.clear()
		user.value = null
		accessToken.value = null
		error.value = null
		sessionInitialized.value = true
		await authService.logout().catch(() => undefined)
	}

	return {
		user,
		accessToken,
		isLoading,
		error,
		isAuthenticated,
		sessionInitialized,
		restoreSession,
		login,
		signup,
		clearError,
		logout,
	}
})

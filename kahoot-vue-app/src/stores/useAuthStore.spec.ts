import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth-service'
import { queryClient } from '../queries/query-client'
import { useAuthStore } from './useAuthStore'

const authResponse = {
	accessToken: 'signed-token',
	tokenType: 'Bearer' as const,
	user: {
		id: 9,
		username: 'player_one',
		email: 'player@example.com',
		createdAt: '2026-01-02T03:04:05.000Z',
	},
}

beforeEach(() => {
	setActivePinia(createPinia())
	queryClient.setQueryData(['protected', 9], 'cached data')
})

afterEach(() => {
	vi.restoreAllMocks()
	queryClient.clear()
})

describe('authStore query cache lifecycle', () => {
	it('clears cached server data after a successful login', async () => {
		vi.spyOn(authService, 'login').mockResolvedValue(authResponse)

		const auth = useAuthStore()
		await expect(auth.login({ email: authResponse.user.email, password: 'password123' })).resolves.toBe(true)

		expect(auth.user?.id).toBe(authResponse.user.id)
		expect(queryClient.getQueryData(['protected', 9])).toBeUndefined()
	})

	it('clears cached server data on logout', () => {
		const auth = useAuthStore()
		auth.logout()

		expect(queryClient.getQueryData(['protected', 9])).toBeUndefined()
	})
})

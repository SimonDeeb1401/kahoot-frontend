import type {
	AuthResponse,
	LoginCredentials,
	SignupCredentials,
} from '../types/user'
import { ApiError, postJson } from './api'

function isAuthResponse(value: unknown): value is AuthResponse {
	if (typeof value !== 'object' || value === null || !('user' in value)) return false

	const response = value as Partial<AuthResponse>
	const user = response.user

	return (
		typeof response.accessToken === 'string' &&
		response.tokenType === 'Bearer' &&
		typeof user === 'object' &&
		user !== null &&
		typeof user.id === 'number' &&
		typeof user.username === 'string' &&
		typeof user.email === 'string' &&
		typeof user.createdAt === 'string'
	)
}

async function requestAuth(path: string, body: LoginCredentials | SignupCredentials): Promise<AuthResponse> {
	const response = await postJson(path, body)
	if (!isAuthResponse(response)) {
		throw new ApiError('The server returned an unexpected authentication response.')
	}
	return response
}

export const authService = {
	login(credentials: LoginCredentials): Promise<AuthResponse> {
		return requestAuth('/auth/login', credentials)
	},

	signup(credentials: SignupCredentials): Promise<AuthResponse> {
		return requestAuth('/auth/signup', credentials)
	},
}

export interface AuthUser {
	id: number
	username: string
	email: string
	createdAt: string
}

export interface AuthResponse {
	accessToken: string
	tokenType: 'Bearer'
	user: AuthUser
}

export interface LoginCredentials {
	email: string
	password: string
}

export interface SignupCredentials extends LoginCredentials {
	username: string
}

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message)
		this.name = 'ApiError'
	}
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

function getErrorMessage(payload: unknown): string | undefined {
	if (typeof payload !== 'object' || payload === null || !('message' in payload)) {
		return undefined
	}

	const { message } = payload
	if (typeof message === 'string') return message
	if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
		return message.join(' ')
	}

	return undefined
}

async function requestJson(
	path: string,
	method: 'GET' | 'POST',
	body?: unknown,
	accessToken?: string,
): Promise<unknown> {
	let response: Response

	try {
		const headers: Record<string, string> = {}
		if (body !== undefined) headers['Content-Type'] = 'application/json'
		if (accessToken) headers.Authorization = `Bearer ${accessToken}`

		const request: RequestInit = { method, headers }
		if (body !== undefined) request.body = JSON.stringify(body)

		response = await fetch(`${apiBaseUrl}${path}`, {
			...request,
		})
	} catch {
		throw new ApiError('Unable to reach the server. Check your connection and try again.')
	}

	const payload: unknown = await response.json().catch(() => null)
	if (!response.ok) {
		throw new ApiError(
			getErrorMessage(payload) ?? 'Something went wrong. Please try again.',
			response.status,
		)
	}

	return payload
}

export function getJson(path: string, accessToken?: string): Promise<unknown> {
	return requestJson(path, 'GET', undefined, accessToken)
}

export function postJson(
	path: string,
	body: unknown,
	accessToken?: string,
): Promise<unknown> {
	return requestJson(path, 'POST', body, accessToken)
}

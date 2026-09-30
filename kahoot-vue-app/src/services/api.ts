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

export async function postJson(path: string, body: unknown): Promise<unknown> {
	let response: Response

	try {
		response = await fetch(`${apiBaseUrl}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
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

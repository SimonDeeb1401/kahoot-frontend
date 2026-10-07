import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { authService } from './auth-service'

const authResponse = {
  accessToken: 'signed-token',
  tokenType: 'Bearer',
  user: {
    id: 9,
    username: 'player_one',
    email: 'player@example.com',
    createdAt: '2026-01-02T03:04:05.000Z',
  },
}

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authService', () => {
  it('posts login credentials and parses the auth response', async () => {
    const fetchMock = mockFetch(authResponse)

    await expect(
      authService.login({ email: 'player@example.com', password: 'password123' }),
    ).resolves.toEqual(authResponse)
    expect(fetchMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'player@example.com', password: 'password123' }),
      credentials: 'include',
    })
  })

  it('posts username, email, and password to signup', async () => {
    const fetchMock = mockFetch(authResponse, 201)
    const credentials = {
      username: 'player_one',
      email: 'player@example.com',
      password: 'password123',
    }

    await expect(authService.signup(credentials)).resolves.toEqual(authResponse)
    expect(fetchMock).toHaveBeenCalledWith('/auth/signup', expect.objectContaining({
      body: JSON.stringify(credentials),
      credentials: 'include',
    }))
  })

  it('restores the current session through the HttpOnly refresh cookie', async () => {
    const fetchMock = mockFetch(authResponse)

    await expect(authService.refresh()).resolves.toEqual(authResponse)
    expect(fetchMock).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    })
  })

  it('surfaces API validation messages and status codes', async () => {
    mockFetch({ message: ['Email must be valid', 'Password is too short'] }, 400)

    await expect(
      authService.login({ email: 'bad', password: 'x' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Email must be valid Password is too short',
      status: 400,
    })
  })

  it('rejects an unexpected successful response shape', async () => {
    mockFetch({ accessToken: 'signed-token' })

    await expect(
      authService.login({ email: 'player@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('converts network failures to a readable API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network failure')))

    await expect(
      authService.login({ email: 'player@example.com', password: 'password123' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unable to reach the server. Check your connection and try again.',
    })
  })
})

import { expect, test } from '@playwright/test'

const user = {
  id: 9,
  username: 'player_one',
  email: 'player@example.com',
  createdAt: '2026-01-02T03:04:05.000Z',
}

const authResponse = {
  accessToken: 'signed-token',
  tokenType: 'Bearer',
  user,
}

const quizResponse = {
  id: 14,
  title: 'Fractions',
  description: null,
  creatorId: user.id,
  createdAt: '2026-09-30T10:00:00.000Z',
  updatedAt: '2026-09-30T10:00:00.000Z',
}

async function signIn(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({ status: 200, json: authResponse })
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('player@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('redirects the app root to the login page', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('validates signup fields before making an API request', async ({ page }) => {
  let apiCalled = false
  await page.route('**/auth/signup', async (route) => {
    apiCalled = true
    await route.fulfill({ status: 201, json: authResponse })
  })

  await page.goto('/signup')
  const username = page.getByLabel('Username')
  await username.fill('not a username')
  await page.getByLabel('Email').fill('player@example.com')
  await page.getByLabel('Password').fill('password123')
  expect(await username.evaluate((input) => (input as HTMLInputElement).validity.patternMismatch)).toBe(true)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/signup$/)
  expect(apiCalled).toBe(false)
})

test('creates an account and returns to login with confirmation', async ({ page }) => {
  let requestBody: unknown
  await page.route('**/auth/signup', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({ status: 201, json: authResponse })
  })

  await page.goto('/signup')
  await page.getByLabel('Username').fill('player_one')
  await page.getByLabel('Email').fill('PLAYER@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/login\?registered=1$/)
  await expect(page.getByRole('status')).toContainText('Your account is ready')
  expect(requestBody).toEqual({
    username: 'player_one',
    email: 'player@example.com',
    password: 'password123',
  })
})

test('signs in, shows the authenticated screen, and logs out', async ({ page }) => {
  let requestBody: unknown
  await page.route('**/auth/login', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, json: authResponse })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('PLAYER@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Good to have you, player_one.' })).toBeVisible()
  expect(requestBody).toEqual({ email: 'player@example.com', password: 'password123' })

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('shows an API error when login credentials are rejected', async ({ page }) => {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({ status: 401, json: { message: 'Invalid email or password' } })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill('player@example.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
  await expect(page).toHaveURL(/\/login$/)
})

test('redirects unauthenticated visitors away from the protected screen', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/login$/)
})

test('opens the quiz form from the dashboard', async ({ page }) => {
  await signIn(page)

  await page.getByRole('link', { name: 'Create a quiz' }).click()

  await expect(page).toHaveURL(/\/quizzes\/new$/)
  await expect(page.getByRole('heading', { name: 'Create a quiz' })).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await expect(page.getByLabel('Description (optional)')).toBeVisible()
})

test('requires a title before sending a quiz creation request', async ({ page }) => {
  let apiCalled = false
  await page.route('**/quizzes', async (route) => {
    apiCalled = true
    await route.fulfill({ status: 201, json: quizResponse })
  })
  await signIn(page)
  await page.getByRole('link', { name: 'Create a quiz' }).click()
  await page.getByRole('button', { name: 'Create quiz' }).click()

  await expect(page).toHaveURL(/\/quizzes\/new$/)
  expect(apiCalled).toBe(false)
})

test('creates a quiz and returns to the dashboard with confirmation', async ({ page }) => {
  let requestBody: unknown
  let authorization: string | undefined
  await page.route('**/quizzes', async (route) => {
    requestBody = route.request().postDataJSON()
    authorization = route.request().headers().authorization
    await route.fulfill({ status: 201, json: quizResponse })
  })
  await signIn(page)
  await page.getByRole('link', { name: 'Create a quiz' }).click()
  await page.getByLabel('Title').fill('  Fractions  ')
  await page.getByRole('button', { name: 'Create quiz' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('status')).toHaveText('Quiz created successfully.')
  expect(requestBody).toEqual({ title: 'Fractions' })
  expect(authorization).toBe('Bearer signed-token')
})

test('shows API errors and keeps the quiz form available', async ({ page }) => {
  await page.route('**/quizzes', async (route) => {
    await route.fulfill({ status: 400, json: { message: 'Quiz title is invalid' } })
  })
  await signIn(page)
  await page.getByRole('link', { name: 'Create a quiz' }).click()
  await page.getByLabel('Title').fill('Fractions')
  await page.getByRole('button', { name: 'Create quiz' }).click()

  await expect(page).toHaveURL(/\/quizzes\/new$/)
  await expect(page.getByRole('alert')).toHaveText('Quiz title is invalid')
})

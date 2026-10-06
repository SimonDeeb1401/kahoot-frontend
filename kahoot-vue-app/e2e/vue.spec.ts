import { expect, test, type Page } from '@playwright/test'

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

const roomResponse = {
  id: 21,
  quizId: 14,
  hostId: user.id,
  roomCode: 'AB12CD',
  status: 'waiting',
  startedAt: null,
  endedAt: null,
}

const questionResponse = {
  id: 3,
  quizId: 14,
  text: 'What is 2 + 2?',
  position: 1,
  timeLimit: 30,
  points: 1000,
}

const answerResponses = [
  { id: 8, questionId: 3, text: '3', isCorrect: false, position: 1 },
  { id: 9, questionId: 3, text: '4', isCorrect: true, position: 2 },
]

interface EditorApiCall {
  method: string
  path: string
  body?: unknown
}

async function mockQuizEditorApi(page: Page): Promise<EditorApiCall[]> {
  const calls: EditorApiCall[] = []
  let nextQuestionId = 4
  let nextAnswerId = 10

  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [quizResponse] })
      return
    }
    await route.fallback()
  })

  await page.route('**/quizzes/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const body = method === 'POST' || method === 'PATCH' ? request.postDataJSON() : undefined
    calls.push({ method, path, body })

    if (path === '/quizzes/14' && method === 'GET') {
      await route.fulfill({ status: 200, json: quizResponse })
      return
    }
    if (path === '/quizzes/14' && method === 'PATCH') {
      await route.fulfill({ status: 200, json: { ...quizResponse, ...body } })
      return
    }
    if (path === '/quizzes/14/questions' && method === 'GET') {
      await route.fulfill({ status: 200, json: [questionResponse] })
      return
    }
    if (path === '/quizzes/14/questions' && method === 'POST') {
      await route.fulfill({ status: 201, json: { ...body, id: nextQuestionId++, quizId: 14 } })
      return
    }

    const questionPath = path.match(/^\/quizzes\/14\/questions\/(\d+)$/)
    if (questionPath && method === 'PATCH') {
      await route.fulfill({ status: 200, json: { ...questionResponse, ...body, id: Number(questionPath[1]) } })
      return
    }
    if (questionPath && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    const answersPath = path.match(/^\/quizzes\/14\/questions\/(\d+)\/answers$/)
    if (answersPath && method === 'GET') {
      await route.fulfill({ status: 200, json: Number(answersPath[1]) === 3 ? answerResponses : [] })
      return
    }
    if (answersPath && method === 'POST') {
      await route.fulfill({
        status: 201,
        json: { ...body, id: nextAnswerId++, questionId: Number(answersPath[1]) },
      })
      return
    }

    const answerPath = path.match(/^\/quizzes\/14\/questions\/(\d+)\/answers\/(\d+)$/)
    if (answerPath && method === 'PATCH') {
      const existing = answerResponses.find((answer) => answer.id === Number(answerPath[2]))
      await route.fulfill({
        status: 200,
        json: { ...existing, ...body, id: Number(answerPath[2]), questionId: Number(answerPath[1]) },
      })
      return
    }
    if (answerPath && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fallback()
  })

  return calls
}

test.beforeEach(async ({ page }) => {
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [] })
      return
    }
    await route.fallback()
  })
  await page.route('**/game-sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [] })
      return
    }
    await route.fallback()
  })
})

async function signIn(page: Page): Promise<void> {
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
  await expect(page.getByRole('heading', { name: 'My quizzes' })).toBeVisible()
  expect(requestBody).toEqual({ email: 'player@example.com', password: 'password123' })

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

for (const status of ['waiting', 'active'] as const) {
  test(`returns to a ${status} joined room after signing in`, async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ status: 200, json: authResponse })
    })
    await page.route('**/game-sessions/joined', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            playerId: 31,
            sessionId: 24,
            roomCode: 'CD34EF',
            nickname: 'Player One',
            status,
            quizTitle: 'Fractions',
          },
        ],
      })
    })

    await page.goto('/login')
    await page.getByLabel('Email').fill('player@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/rooms\/24\/lobby$/)
    await expect(page.getByRole('heading', { name: "You're in, Player One." })).toBeVisible()
  })
}

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

  await expect(page).toHaveURL(/\/login\?redirect=\/dashboard$/)
})

test('lists quizzes returned for the signed-in user', async ({ page }) => {
  let authorization: string | undefined
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    authorization = route.request().headers().authorization
    await route.fulfill({ status: 200, json: [quizResponse] })
  })
  await signIn(page)

  await expect(page.getByRole('heading', { name: 'My quizzes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fractions' })).toBeVisible()
  await expect(page.getByText('No description')).toBeVisible()
  expect(authorization).toBe('Bearer signed-token')
})

test('shows an empty state when the user has no quizzes', async ({ page }) => {
  await signIn(page)

  await expect(page.getByRole('heading', { name: 'No quizzes yet' })).toBeVisible()
})

test('switches to the rooms tab and displays hosted sessions in a grid', async ({ page }) => {
  await page.route('**/game-sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [roomResponse] })
      return
    }
    await route.fallback()
  })
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [quizResponse] })
      return
    }
    await route.fallback()
  })
  await signIn(page)

  await page.getByRole('tab', { name: 'Rooms' }).click()
  await expect(page).toHaveURL(/\/dashboard\?view=rooms$/)
  await expect(page.getByRole('heading', { name: 'Hosted rooms' })).toBeVisible()
  await expect(page.getByText('AB12CD')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fractions' })).toBeVisible()
  await expect(page.locator('.rooms-grid')).toBeVisible()
})

test('creates a room from the selected quiz using the contextual plus action', async ({ page }) => {
  let requestBody: unknown
  let sessions = [] as typeof roomResponse[]
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [quizResponse] })
      return
    }
    await route.fallback()
  })
  await page.route('**/game-sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: sessions })
      return
    }
    requestBody = route.request().postDataJSON()
    sessions = [roomResponse]
    await route.fulfill({ status: 201, json: roomResponse })
  })
  await signIn(page)

  await page.getByRole('tab', { name: 'Rooms' }).click()
  await page.getByRole('link', { name: 'Create a room' }).click()
  await expect(page).toHaveURL(/\/rooms\/new$/)
  await page.getByLabel('Quiz').selectOption('14')
  await page.getByRole('button', { name: 'Create room' }).click()

  await expect(page).toHaveURL(/\/dashboard\?view=rooms$/)
  await expect(page.getByText('Room created successfully.')).toBeVisible()
  await expect(page.getByText('AB12CD')).toBeVisible()
  expect(requestBody).toEqual({ quizId: 14 })
})

test('shows a recoverable message if the quiz list fails to load', async ({ page }) => {
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({ status: 500, json: { message: 'Quiz list unavailable' } })
  })
  await signIn(page)

  await expect(page.getByRole('alert')).toContainText('Quiz list unavailable')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('shows create and sign-out actions as accessible icon buttons', async ({ page }) => {
  await signIn(page)

  await expect(page.getByRole('link', { name: 'Create a quiz' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

test('asks before deleting a quiz and keeps it when deletion is cancelled', async ({ page }) => {
  let deleteCalled = false
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [quizResponse] })
      return
    }
    await route.fallback()
  })
  await page.route('**/quizzes/**', async (route) => {
    deleteCalled = route.request().method() === 'DELETE'
    await route.fulfill({ status: 204, body: '' })
  })
  await signIn(page)

  let dialogMessage = ''
  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Delete Fractions' }).click()

  expect(dialogMessage).toContain('Fractions')
  await expect(page.getByRole('heading', { name: 'Fractions' })).toBeVisible()
  expect(deleteCalled).toBe(false)
})

test('deletes the quiz only after confirmation', async ({ page }) => {
  let authorization: string | undefined
  await page.route('**/quizzes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: [quizResponse] })
      return
    }
    await route.fallback()
  })
  await page.route('**/quizzes/**', async (route) => {
    if (route.request().method() === 'DELETE') {
      authorization = route.request().headers().authorization
      await route.fulfill({ status: 204, body: '' })
      return
    }
    await route.fallback()
  })
  await signIn(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete Fractions' }).click()

  await expect(page.getByRole('status')).toHaveText('Quiz deleted successfully.')
  await expect(page.getByRole('heading', { name: 'Fractions' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'No quizzes yet' })).toBeVisible()
  expect(authorization).toBe('Bearer signed-token')
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
		if (route.request().method() !== 'POST') {
			await route.fallback()
			return
		}
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
		if (route.request().method() !== 'POST') {
			await route.fallback()
			return
		}
    requestBody = route.request().postDataJSON()
    authorization = route.request().headers().authorization
    await route.fulfill({ status: 201, json: quizResponse })
  })
  await signIn(page)
  await page.getByRole('link', { name: 'Create a quiz' }).click()
  await page.getByLabel('Title').fill('  Fractions  ')
  await page.getByRole('button', { name: 'Create quiz' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Quiz created successfully.')).toBeVisible()
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

test('edits quiz details, questions, and answers and supports adding and deleting items', async ({ page }) => {
  const calls = await mockQuizEditorApi(page)
  await signIn(page)
  await page.getByRole('link', { name: 'Edit Fractions' }).click()

  await expect(page).toHaveURL(/\/quizzes\/14\/edit$/)
  await expect(page.getByLabel('Question text')).toHaveValue(questionResponse.text)
  await expect(page.getByRole('textbox', { name: 'Answer 2', exact: true })).toHaveValue('4')

  await page.getByLabel('Title').fill('Addition practice')
  await page.getByLabel('Description (optional)').fill('Updated description')
  await page.getByRole('button', { name: 'Save details' }).click()
  await expect(page.getByText('Quiz details saved.')).toBeVisible()

  const firstQuestion = page.locator('.question-editor').nth(0)
  await firstQuestion.getByLabel('Question text').fill('What is 3 + 2?')
  await firstQuestion.getByRole('textbox', { name: 'Answer 1', exact: true }).fill('5')
  await firstQuestion.getByLabel('Mark answer 1 correct').check()
  await firstQuestion.getByRole('button', { name: 'Save question' }).click()
  await expect(firstQuestion.getByText('Question and answers saved.')).toBeVisible()
  expect(calls.some((call) => call.method === 'PATCH' && call.path === '/quizzes/14')).toBe(true)
  expect(calls.some((call) => call.method === 'PATCH' && call.path === '/quizzes/14/questions/3')).toBe(true)
  expect(calls.some((call) => call.method === 'PATCH' && call.path === '/quizzes/14/questions/3/answers/8')).toBe(true)

  await page.getByRole('button', { name: 'Add question' }).click()
  const newQuestion = page.locator('.question-editor').nth(1)
  await newQuestion.getByLabel('Question text').fill('What is 5 + 5?')
  await newQuestion.getByRole('textbox', { name: 'Answer 1', exact: true }).fill('10')
  await newQuestion.getByRole('textbox', { name: 'Answer 2', exact: true }).fill('11')
  await newQuestion.getByRole('button', { name: 'Save question' }).click()
  await expect(newQuestion.getByText('Question and answers saved.')).toBeVisible()
  expect(calls.some((call) => call.method === 'POST' && call.path === '/quizzes/14/questions')).toBe(true)
  expect(calls.some((call) => call.method === 'POST' && call.path === '/quizzes/14/questions/4/answers')).toBe(true)

  page.once('dialog', (dialog) => dialog.accept())
  await newQuestion.getByRole('button', { name: 'Delete question 2' }).click()
  await expect(page.locator('.question-editor')).toHaveCount(1)
  expect(calls.some((call) => call.method === 'DELETE' && call.path === '/quizzes/14/questions/4')).toBe(true)

  page.once('dialog', (dialog) => dialog.accept())
  await firstQuestion.getByRole('button', { name: 'Delete answer 2' }).click()
  await expect(firstQuestion.getByRole('textbox', { name: 'Answer 2', exact: true })).toHaveCount(0)
  expect(calls.some((call) => call.method === 'DELETE' && call.path === '/quizzes/14/questions/3/answers/9')).toBe(true)
})

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'login' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignUpView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rooms',
      name: 'available-rooms',
      component: () => import('../views/AvailableRoomsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rooms/:sessionId/lobby',
      name: 'room-lobby',
      component: () => import('../views/RoomLobbyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/quizzes/new',
      name: 'create-quiz',
      component: () => import('../views/CreateQuizView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rooms/new',
      name: 'create-room',
      component: () => import('../views/CreateRoomView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/quizzes/:quizId/edit',
      name: 'edit-quiz',
      component: () => import('../views/EditQuizView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login' }
  if (auth.isAuthenticated && (to.name === 'login' || to.name === 'signup')) {
    return { name: 'dashboard' }
  }

  return true
})

export default router

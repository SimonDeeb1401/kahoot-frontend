<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

defineProps<{ active: 'dashboard' | 'rooms' }>()

const auth = useAuth()
const router = useRouter()

async function logout(): Promise<void> {
	await auth.logout()
	await router.replace({ name: 'login' })
}
</script>

<template>
	<header class="app-header">
		<nav class="app-header-nav" aria-label="Main navigation">
			<RouterLink
				class="app-header-link"
				:class="{ 'app-header-link--active': active === 'dashboard' }"
				:to="{ name: 'dashboard' }"
				:aria-current="active === 'dashboard' ? 'page' : undefined"
			>
				Dashboard
			</RouterLink>
			<RouterLink
				class="app-header-link"
				:class="{ 'app-header-link--active': active === 'rooms' }"
				:to="{ name: 'available-rooms' }"
				:aria-current="active === 'rooms' ? 'page' : undefined"
			>
				Join a room
			</RouterLink>
		</nav>
		<button
			class="dashboard-icon-button app-header-signout"
			type="button"
			aria-label="Sign out"
			title="Sign out"
			@click="logout"
		>
			<LogOut :size="18" :stroke-width="2" aria-hidden="true" />
		</button>
	</header>
</template>

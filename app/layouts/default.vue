<template>
  <div class="min-h-screen flex">
    <!-- Header -->
    <UHeader class="w-full fixed top-0 z-50">
      <template #left>
        <UButton
          @click="drawer = !drawer"
          icon="i-lucide-menu"
          variant="ghost"
          size="lg"
          class="lg:hidden"
        />
        <UButton
          @click="collapsed = !collapsed"
          :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          variant="ghost"
          size="lg"
          class="hidden lg:inline-flex"
          :title="collapsed ? 'Expand menu' : 'Collapse menu'"
        />
        <div class="text-sm font-semibold truncate px-2">Redmine Client Tools</div>
      </template>

      <template #right>
        <ThemeToggle />
        <UButton
          v-if="isLoggedIn"
          icon="i-mdi-logout"
          color="error"
          variant="ghost"
          size="sm"
          @click="handleLogout"
          title="Logout"
        />
      </template>
    </UHeader>

    <!-- Sidebar -->
    <div
      v-show="isDesktop || drawer"
      class="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-all duration-200"
      :class="[
        isDesktop && collapsed ? 'w-16' : 'w-64',
        {
          'fixed inset-y-0 left-0 z-40 pt-16': !isDesktop,
          'relative pt-16': isDesktop
        }
      ]"
    >
      <Sidebar :collapsed="isDesktop && collapsed" />
    </div>

    <!-- Overlay for mobile -->
    <div
      v-show="drawer && isMdAndDown"
      @click="drawer = false"
      class="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
    ></div>

    <!-- Main content -->
    <main class="flex-1 pt-16">
      <div class="container mx-auto p-4 page-wrapper">
        <NuxtPage />
      </div>
    </main>
  </div>
</template>

<script setup>
import ThemeToggle from '~/components/ThemeToggle.vue'

const authCookie = useCookie('admin_session')
const isLoggedInCookie = useCookie('is_logged_in')
const isLoggedIn = computed(() => !!isLoggedInCookie.value)

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authCookie.value = null
    isLoggedInCookie.value = null
    navigateTo('/login')
  } catch (err) {
    console.error('Logout failed', err)
  }
}

const isDesktop = computed(() => {
  if (process.client) {
    return window.innerWidth >= 1024;
  }
  return true; // Default to desktop for SSR
});

// For mobile drawer
const drawer = ref(false);
const isMdAndDown = computed(() => {
  if (process.client) {
    return window.innerWidth < 1024;
  }
  return false; // Default to desktop for SSR
});

// For desktop sidebar collapse
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';
const collapsed = ref(false);
watch(collapsed, (value) => {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
});

// Set the initial state of the drawer based on the screen size
onMounted(() => {
  drawer.value = isDesktop.value;
  collapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
});
</script>

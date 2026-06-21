<template>
  <div>
    <div class="scrollnavbar">
      <div class="version-text">version: {{ version }}</div>
      <ul class="pt-0 pr-4 pb-4 pl-4">
        <!-- ---------------------------------------------- -->
        <!---Menu Loop -->
        <!-- ---------------------------------------------- -->
        <li
          v-for="(item, i) in sidebarMenu"
          :key="i"
          class="mb-1"
        >
          <NuxtLink
            :to="item.to"
            class="sidebar-link flex items-center rounded-lg p-2 transition-colors"
            :class="{ 'sidebar-link-active': isActive(item.to) }"
          >
            <UIcon :name="item.icon" class="mr-2" />
            <span class="sidebar-title">{{ item.title }}</span>
          </NuxtLink>
        </li>
        <!-- Admin Section -->
        <li v-if="isLoggedIn" class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div class="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Admin
          </div>
          <NuxtLink to="/admin/release-mail" class="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-primary font-medium">
            <UIcon name="i-mdi-email-fast-outline" class="mr-2" />
            Release Mail
          </NuxtLink>
          <NuxtLink to="/admin/branches" class="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-primary font-medium mt-1">
            <UIcon name="i-mdi-source-branch" class="mr-2" />
            GitLab Branches
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import sidebarItems from "./sidebarItems";
const sidebarMenu = ref(sidebarItems);
const route = useRoute();

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }

  return route.path.startsWith(path)
}

const authCookie = useCookie('admin_session')
const isLoggedInCookie = useCookie('is_logged_in')
const isLoggedIn = computed(() => !!isLoggedInCookie.value)

console.log(import.meta.env.VITE_APP_VERSION)
const config = useRuntimeConfig();
console.log(config.public.appVersion);

const version = ref(config.public.appVersion || "0.2.0-DEV");
</script>

<style scoped>
.sidebar-link {
  color: inherit;
}

.sidebar-link:hover {
  background: rgba(29, 158, 117, 0.08);
}

.sidebar-link-active {
  background: linear-gradient(135deg, rgba(29, 158, 117, 0.18), rgba(29, 158, 117, 0.08));
  color: #1d9e75;
  border: 1px solid rgba(29, 158, 117, 0.24);
  font-weight: 600;
}

.version-text {
  display: flex;
  justify-content: center; /* Center horizontally */
  align-items: center; /* Center vertically */
  height: 50px; /* Adjust height as needed */
  font-size: 16px; /* Adjust font size as needed */
  font-weight: bold; /* Optional: Make the text bold */
  text-align: center; /* Ensure text alignment */
  padding-bottom: 0px;
}

.sidebar-title {
  white-space: pre-line; /* honor \n in strings and wrap accordingly */
}
</style>

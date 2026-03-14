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
          <NuxtLink :to="item.to" class="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <UIcon :name="item.icon" class="mr-2" />
            {{ item.title }}
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
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import sidebarItems from "./sidebarItems";
const sidebarMenu = ref(sidebarItems);

const authCookie = useCookie('admin_session')
const isLoggedInCookie = useCookie('is_logged_in')
const isLoggedIn = computed(() => !!isLoggedInCookie.value)

console.log(import.meta.env.VITE_APP_VERSION)
const config = useRuntimeConfig();
console.log(config.public.appVersion);

const version = ref(config.public.appVersion || "0.2.0-DEV");
</script>

<style scoped>
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
</style>

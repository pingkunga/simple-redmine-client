<template>
  <div class="min-h-screen flex">
    <!-- Header -->
    <UHeader class="w-full fixed top-0 z-50">
      <UButton
        @click="drawer = !drawer"
        icon="i-lucide-menu"
        variant="ghost"
        size="lg"
        class="lg:hidden"
      />
      <div class="flex-1">Redmine Client Tools</div>
    </UHeader>

    <!-- Sidebar -->
    <div
      v-show="isDesktop || drawer"
      class="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0"
      :class="{
        'fixed inset-y-0 left-0 z-40 pt-16': !isDesktop,
        'relative pt-16': isDesktop
      }"
    >
      <Sidebar />
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

// Set the initial state of the drawer based on the screen size
onMounted(() => {
  drawer.value = isDesktop.value;
});
</script>

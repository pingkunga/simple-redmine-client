<template>
  <UButton
    variant="ghost"
    size="md"
    aria-label="Toggle theme"
    @click="toggle"
  >
    <UIcon :name="iconName" />
  </UButton>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const isDark = ref(false)

const apply = (dark: boolean) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('dark', dark)
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (e) {}
}

onMounted(() => {
  if (!import.meta.client) return
  const saved = (() => {
    try { return localStorage.getItem('theme') } catch (e) { return null }
  })()
  if (saved) {
    isDark.value = saved === 'dark'
  } else {
    isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  apply(isDark.value)
})

const toggle = () => {
  isDark.value = !isDark.value
  apply(isDark.value)
}

const iconName = computed(() => isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon')
</script>

<style scoped></style>

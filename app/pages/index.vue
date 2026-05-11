<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div v-if="pending" class="flex justify-center items-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div v-else-if="error" class="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
      <div class="flex items-center gap-3 text-red-700 dark:text-red-400">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
        <h3 class="font-bold">Error loading release information</h3>
      </div>
      <p class="mt-2 text-sm">{{ error.statusMessage || error.message }}</p>
    </div>

    <div v-else>
      <header class="mb-8">
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Current Release Dashboard
        </h1>
        <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">
          This week's releases and version status
        </p>
      </header>

      <div v-if="Object.keys(groupedReleases).length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="(releases, branch) in groupedReleases" 
          :key="branch"
          class="bg-white dark:bg-gray-900 overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800 transition-all hover:shadow-xl sm:rounded-xl"
        >
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-cube-transparent" class="w-6 h-6 text-primary-500" />
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ branch }}</h3>
              </div>
              <UBadge color="primary" variant="subtle" size="sm">
                {{ releases[0]?.versionDueDateWorkingDayText }}
              </UBadge>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
              {{ releases[0]?.ownerTeam }}
            </p>

            <div class="space-y-3">
              <div 
                v-for="rel in releases" 
                :key="rel.id"
                class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div class="flex flex-col">
                  <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {{ rel.name }}
                  </span>
                  <span class="text-xs text-gray-400 truncate max-w-[150px]" :title="rel.description">
                    {{ rel.description || 'No description' }}
                  </span>
                </div>
                <UBadge :color="getStatusColor(rel.status)" size="xs" variant="solid">
                  {{ rel.status }}
                </UBadge>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-800/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>Next Build:</span>
              <span class="font-medium text-primary-500">{{ releases[0]?.nextWeekReleaseVersion }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <UIcon name="i-heroicons-calendar" class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No releases this week</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Everything is up to date.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VersionWithReleaseNotes } from '~/shared/types/Version'

interface GroupedReleases {
  [key: string]: VersionWithReleaseNotes[]
}

const { data, pending, error } = await useFetch<VersionWithReleaseNotes[]>('/api/release/thisweek-release')

const groupedReleases = computed(() => {
  if (!data.value) return {}
  
  return data.value.reduce((groups: GroupedReleases, version) => {
    const branch = version.currentReleaseBranch || 'Others'
    if (!groups[branch]) {
      groups[branch] = []
    }
    groups[branch].push(version)
    return groups
  }, {})
})

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'closed': return 'gray'
    case 'locked': return 'orange'
    case 'open': return 'green'
    default: return 'primary'
  }
}
</script>

<style scoped>
</style>
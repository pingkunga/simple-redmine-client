<script setup lang="ts">
import { h } from 'vue'
import type { GitLabProject, GitLabBranch } from '~~/shared/types/GitLab'
import { UBadge, UButton, UIcon } from '#components'

const { fetchGitLabProjects, fetchGitLabBranches, syncGitLabEvents } = useGitLabAPI()

const projects = ref<GitLabProject[]>([])
const selectedProject = ref<GitLabProject>()
const branches = ref<GitLabBranch[]>([])
const loading = ref(false)
const syncLoading = ref(false)
const isSyncModalOpen = ref(false)

const toISODate = (date: Date) => date.toISOString().slice(0, 10)
const syncForm = reactive({
  after: toISODate(new Date(new Date().setFullYear(new Date().getFullYear() - 3))),
  before: toISODate(new Date())
})

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeAge = (dateString: string | undefined) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const units = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];

  for (const unit of units) {
    const interval = Math.floor(diffInSeconds / unit.seconds);
    if (interval >= 1) {
      return `${interval} ${unit.label}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
};

const columns = [
  { 
    accessorKey: 'name', 
    header: 'Branch Name',
    cell: ({ row }: any) => {
        const branch = row.original as GitLabBranch
        return h('div', { class: 'flex items-center gap-2' }, [
            branch.default ? h(UIcon, { name: 'i-mdi-star', class: 'text-yellow-500' }) : null,
            h('span', { class: 'font-medium' }, branch.name),
            branch.merged ? h(UBadge, { color: 'success', variant: 'soft', size: 'xs' }, () => 'Merged') : null,
            branch.protected ? h(UBadge, { color: 'error', variant: 'soft', size: 'xs' }, () => 'Protected') : null
        ])
    }
  },
  { 
    accessorKey: 'creator_name', 
    header: 'Creator' 
  },
  { 
    accessorKey: 'created_at', 
    header: 'Created At (Age)',
    cell: ({ row }: any) => {
        const branch = row.original as GitLabBranch
        return h('div', { class: 'flex flex-col' }, [
            h('span', formatDate(branch.created_at)),
            h('div', { class: 'flex items-center gap-1 mt-0.5' }, [
                h('span', { class: 'text-xs text-gray-500 font-medium' }, getRelativeAge(branch.created_at)),
                h(UBadge, { 
                    color: branch.is_direct ? 'success' : 'neutral', 
                    variant: 'soft', 
                    size: 'xs',
                    class: 'px-1 py-0 text-[10px]'
                }, () => branch.is_direct ? 'Direct' : 'Indirect')
            ])
        ])
    }
  },
  { 
    accessorKey: 'commit_title', 
    header: 'Latest Commit',
    cell: ({ row }: any) => {
        const branch = row.original as GitLabBranch
        return h('div', { class: 'flex flex-col max-w-md' }, [
            h('span', { class: 'text-sm truncate' }, branch.commit.title),
            h('span', { class: 'text-xs text-gray-500' }, `${branch.commit.short_id} by ${branch.commit.author_name}`)
        ])
    }
  },
  { 
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: any) => {
        const branch = row.original as GitLabBranch
        return h(UButton, {
            to: branch.web_url,
            target: '_blank',
            icon: 'i-mdi-open-in-new',
            variant: 'ghost',
            color: 'neutral',
            size: 'xs'
        })
    }
  }
]

const loadProjects = async () => {
  const { data } = await fetchGitLabProjects()
  if (data.value) {
    projects.value = data.value as GitLabProject[]
    if (projects.value.length > 0) {
      selectedProject.value = projects.value[0]
    }
  }
}

const loadBranches = async () => {
  if (!selectedProject.value) return
  
  loading.value = true
  try {
    const { data } = await fetchGitLabBranches(selectedProject.value.id)
    if (data.value) {
      branches.value = data.value as GitLabBranch[]
    }
  } finally {
    loading.value = false
  }
}

const startEventSync = async () => {
  if (!selectedProject.value) return

  isSyncModalOpen.value = false
  syncLoading.value = true
  try {
    await syncGitLabEvents(selectedProject.value.id, syncForm.after, syncForm.before)
    await loadBranches()
  } catch (error) {
    console.error('Sync failed', error)
  } finally {
    syncLoading.value = false
  }
}

watch(selectedProject, () => {
  if (!selectedProject.value) return
  loadBranches()
})

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <div class="flex flex-col gap-4 max-w-7xl mx-auto w-full">
    <div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
      <h1 class="text-2xl font-bold">GitLab Branches</h1>
      <div class="flex items-center gap-4">
        <USelectMenu
          v-model="selectedProject"
          :items="projects"
          label-key="name"
          placeholder="Select Repository"
          class="w-64"
        >
          <template #default="{ modelValue }">
            <span v-if="modelValue">{{ modelValue.name }}</span>
            <span v-else>Select Repository</span>
          </template>
        </USelectMenu>
        <div class="flex gap-2">
          <UButton
            icon="i-mdi-database-refresh"
            color="neutral"
            variant="soft"
            :disabled="!selectedProject || syncLoading"
            @click="isSyncModalOpen = true"
          >
            Initial Cache
          </UButton>
          <UButton
            icon="i-mdi-refresh"
            color="neutral"
            variant="soft"
            :loading="loading"
            :disabled="syncLoading"
            @click="loadBranches"
          >
            Refresh
          </UButton>
        </div>
      </div>
    </div>

    <UTable
      :data="branches"
      :columns="columns"
      :loading="loading"
      class="w-full"
    />

    <UModal v-model:open="isSyncModalOpen" title="Initial Cache Sync" size="lg">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Fetch historical push events to identify branch creators. This action is usually run only once per project.
          </p>

          <UFormField label="Start Date">
            <UInput v-model="syncForm.after" type="date" />
          </UFormField>

          <UFormField label="End Date">
            <UInput v-model="syncForm.before" type="date" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" :disabled="syncLoading" @click="isSyncModalOpen = false">Cancel</UButton>
            <UButton color="primary" :loading="syncLoading" @click="startEventSync">Start Sync</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <Teleport to="body">
      <div v-if="syncLoading" class="fixed bottom-4 right-4 bg-primary-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse z-9999">
        <UIcon name="i-mdi-sync" class="animate-spin" />
        <span>Syncing GitLab events... please wait.</span>
      </div>
    </Teleport>
  </div>
</template>


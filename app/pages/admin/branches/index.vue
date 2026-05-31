<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { GitLabProject, GitLabBranch } from '~~/shared/types/GitLab'
import { UBadge, UButton, UIcon } from '#components'

const { fetchGitLabProjects, fetchGitLabBranches } = useGitLabAPI()

const projects = ref<GitLabProject[]>([])
const selectedProject = ref<GitLabProject | null>(null)
const branches = ref<GitLabBranch[]>([])
const loading = ref(false)

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

watch(selectedProject, () => {
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
        <UButton
          icon="i-mdi-refresh"
          color="neutral"
          variant="soft"
          :loading="loading"
          @click="loadBranches"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <UTable
      :data="branches"
      :columns="columns"
      :loading="loading"
      class="w-full"
    />
  </div>
</template>


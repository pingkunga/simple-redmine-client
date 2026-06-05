<script setup lang="ts">
import { h } from 'vue'
import type { GitLabProject, GitLabBranch } from '~~/shared/types/GitLab'
import { UBadge, UButton, UIcon, UInput, USelect, UPagination } from '#components'
import { getPaginationRowModel, type CellContext } from '@tanstack/vue-table'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

const { fetchGitLabProjects, fetchGitLabBranches, syncGitLabEvents } = useGitLabAPI()

const projects = ref<GitLabProject[]>([])
const selectedProject = ref<GitLabProject>()
const branches = ref<GitLabBranch[]>([])
const loading = ref(false)
const syncLoading = ref(false)
const isSyncModalOpen = ref(false)

// UI / filter state (match Versions pattern)
const searchText = ref<string | undefined>(undefined)
const selectedFlags = ref<string[]>([])
const columnFilters = ref([])
const refreshKey = ref(0)

const table = useTemplateRef('table')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const currentPage = ref(1)

watch(
  () => table.value?.tableApi?.getState().pagination.pageIndex,
  (newIndex) => {
    currentPage.value = (newIndex || 0) + 1
  },
  { immediate: true }
)

watch(currentPage, (newPage) => {
  table.value?.tableApi?.setPageIndex(newPage - 1)
})

// Options for flag filter (multi-select)
const flagOptions = [
  { label: 'Merged', value: 'merged' },
  { label: 'Protected', value: 'protected' },
  { label: 'Direct', value: 'direct' }
]

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

const getAgeDays = (dateString: string | undefined) => {
  if (!dateString) return 0;
  const dayInMilliseconds = 1000 * 60 * 60 * 24;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();

  return Math.floor(diffInMilliseconds / dayInMilliseconds);
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
    id: 'ageDays',
    accessorFn: (branch: GitLabBranch) => getAgeDays(branch.created_at),
    header: 'Age (Days)',
    enableSorting: true,
    cell: ({ row }: CellContext<GitLabBranch, number>) => h('span', { class: 'font-medium' }, row.getValue('ageDays'))
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
      refreshKey.value++
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

// computed filtered data (client-side)
const filteredBranches = computed(() => {
  const q = (searchText.value || '').toLowerCase().trim()
  const flags = selectedFlags.value || []

  return branches.value.filter((b) => {
    // flags filter
    if (flags.length > 0) {
      const ok = flags.every((f) => {
        if (f === 'merged') return !!b.merged
        if (f === 'protected') return !!b.protected
        if (f === 'direct') return !!b.is_direct
        return true
      })
      if (!ok) return false
    }

    if (!q) return true
    const hay = [
      b.name,
      b.creator_name,
      b.commit?.title,
      b.commit?.author_name,
      b.commit?.short_id
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
})

onMounted(() => {
  loadProjects()
})

const getExportBranches = () => {
  const tableApi = table.value?.tableApi
  if (tableApi) {
    return tableApi.getPrePaginationRowModel().rows.map((r: any) => r.original)
  }
  return filteredBranches.value
}

const exportToExcel = () => {
  const exportBranches = getExportBranches()
  if (!exportBranches || exportBranches.length === 0) return

  const rows = exportBranches.map((b: any) => ({
    Name: b.name,
    Creator: b.creator_name || '',
    CreatedAt: formatDate(b.created_at),
    Age: getRelativeAge(b.created_at),
    AgeDays: getAgeDays(b.created_at),
    CommitTitle: b.commit?.title || '',
    CommitShortId: b.commit?.short_id || '',
    CommitAuthor: b.commit?.author_name || '',
    Merged: b.merged ? 'Yes' : 'No',
    Protected: b.protected ? 'Yes' : 'No',
    WebUrl: b.web_url || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 30 }, // Name
    { wch: 20 }, // Creator
    { wch: 14 }, // CreatedAt
    { wch: 12 }, // Age
    { wch: 10 }, // AgeDays
    { wch: 50 }, // CommitTitle
    { wch: 12 }, // CommitShortId
    { wch: 20 }, // CommitAuthor
    { wch: 8 },
    { wch: 10 },
    { wch: 40 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Branches')

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `branches_${new Date().toISOString().slice(0, 10)}.xlsx`
  saveAs(blob, fileName)
}
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

        <div class="flex items-center gap-4">
          <UInput v-model="searchText" placeholder="Search branches..." class="w-64" clearable />
          <USelect v-model="selectedFlags" :items="flagOptions" multiple placeholder="Flags..." class="w-40" />
        </div>

        <div class="flex gap-2 ml-auto">
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
          <UButton
            icon="i-heroicons-document-arrow-down"
            color="neutral"
            variant="outline"
            @click="exportToExcel"
          >
            Export Excel
          </UButton>
        </div>
      </div>
    </div>

    <UTable
      :key="refreshKey"
      ref="table"
      :data="filteredBranches"
      :columns="columns"
      :loading="loading"
      class="w-full"
      v-model:global-filter="searchText"
      :column-filters="columnFilters"
      v-model:pagination="pagination"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
    />

    <div class="flex justify-end mt-2">
      <UPagination v-model:page="currentPage" :items-per-page="table?.tableApi?.getState().pagination.pageSize"
        :total="table?.tableApi?.getFilteredRowModel().rows.length" />
    </div>

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

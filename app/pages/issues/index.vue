<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">Issues</h1>
    
    <div class="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div class="w-full sm:w-1/2 md:w-1/3">
          <USelectMenu
            v-model="selectedVersions"
            :items="versions"
            multiple
            placeholder="Select Versions"
            label-key="name"
            class="w-full"
            :search-input="{ placeholder: 'Search versions...' }"
            virtualize
          >
            <template #default="{ modelValue }">
              <span v-if="modelValue?.length" class="truncate">
                {{ modelValue.map((v: Version) => v.name).join(', ') }}
              </span>
              <span v-else class="text-gray-500 dark:text-gray-400">Select Versions</span>
            </template>
          </USelectMenu>
        </div>
        <div>
          <UButton icon="i-heroicons-magnifying-glass" @click="handleGetIssuesByVersion">Search</UButton>
        </div>
      </div>
      
      <!-- Group Panel Drop Zone -->
      <div 
        class="w-full min-h-[40px] border-2 border-dashed rounded-lg flex items-center px-4 transition-colors"
        :class="isDragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-300 dark:border-gray-700'"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop="handleDrop"
      >
        <div v-if="groupedColumns.length > 0" class="flex items-center gap-2 flex-wrap py-1">
          <span class="text-sm text-gray-500 mr-2">Grouped by:</span>
          <UBadge 
            v-for="col in groupedColumns" 
            :key="col" 
            :label="columnLabels[col] || col" 
            variant="subtle" 
            size="lg"
          >
            {{ columnLabels[col] || col }}
            <template #trailing>
              <UIcon name="i-heroicons-x-mark" class="cursor-pointer" @click="removeGroup(col)" />
            </template>
          </UBadge>
        </div>
        <div v-else class="text-gray-400 text-sm flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-down-tray" />
          <span>Drag a column header here to group</span>
        </div>
      </div>
    </div>

    <UTable 
      :data="IssuesByVersions" 
      :columns="columns"
      v-model:grouping="groupedColumns"
      :grouping-options="{
        groupedColumnMode: 'remove',
        getGroupedRowModel: getGroupedRowModel()
      }"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig } from "#app";
import type { TableColumn } from "@nuxt/ui";
import { getGroupedRowModel } from '@tanstack/vue-table'

const config = useRuntimeConfig();
const baseUrl = config.public.redmineUrl;

const { data: dataversions } = await useRedmineAPI().getVersions<Version[]>();
const versions = computed(() => dataversions.value ?? []);

const selectedVersions = ref<Version[]>([]);
const IssuesByVersions = ref<Issue[]>([]);

const groupedColumns = ref<string[]>([])

// Drag & Drop Logic
const isDragOver = ref(false)
const draggedColumn = ref<string | null>(null)

const handleDragStart = (event: DragEvent, columnId: string) => {
  draggedColumn.value = columnId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', columnId)
  }
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  const columnId = event.dataTransfer?.getData('text/plain')
  if (columnId && ['projectName', 'versionName', 'statusName', 'assignedToUserName'].includes(columnId)) {
    if (!groupedColumns.value.includes(columnId)) {
      groupedColumns.value = [...groupedColumns.value, columnId]
    }
  }
}

const removeGroup = (columnId: string) => {
  groupedColumns.value = groupedColumns.value.filter(id => id !== columnId)
}

const columnLabels: Record<string, string> = {
  projectName: 'Project Name',
  versionName: 'Version',
  statusName: 'Status',
  assignedToUserName: 'Assignee'
}

const selectedVersionIds = computed(() => {
  return selectedVersions.value.map((version) => version.id).join(",");
});

const handleGetIssuesByVersion = async () => {
  if (!selectedVersionIds.value) {
    return;
  }
  const { data } = await useRedmineAPI().getIssuesByVersion<Issue[]>(
    selectedVersionIds.value
  );
  IssuesByVersions.value = data.value ?? [];
};

const renderDraggableHeader = (title: string, columnId: string) => {
  return h('div', {
    draggable: true,
    onDragstart: (e: DragEvent) => handleDragStart(e, columnId),
    class: 'cursor-grab active:cursor-grabbing flex items-center gap-1 hover:text-primary-500 transition-colors'
  }, [
    h('span', title),
    h(resolveComponent('UIcon'), { name: 'i-heroicons-bars-2', class: 'w-4 h-4 text-gray-400' })
  ])
}

const columns: TableColumn<Issue>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => h('div', '#'),
    cell: ({ row }) => {
      if (row.getIsGrouped()) {
        const columnId = row.groupingColumnId as string
        const label = columnLabels[columnId] || columnId
        return h('div', { 
          class: 'flex items-center gap-2',
          style: { paddingLeft: `${row.depth * 1.5}rem` }
        }, [
          h(resolveComponent('UButton'), {
            color: 'gray',
            variant: 'ghost',
            icon: row.getIsExpanded() ? 'i-heroicons-minus' : 'i-heroicons-plus',
            size: 'xs',
            class: '-ml-2',
            onClick: row.getToggleExpandedHandler(),
          }),
          h('span', { class: 'font-bold' }, `${label}: ${row.getValue(columnId)} (${row.subRows.length})`)
        ])
      }
      return h('a', { 
        href: `${baseUrl}/issues/${row.getValue('id')}`, 
        target: '_blank',
        class: 'text-primary hover:underline',
        style: { paddingLeft: `${row.depth * 1.5}rem` }
      }, `${row.getValue('id')}`)
    },
  },
  {
    accessorKey: 'projectName',
    header: ({ column }) => renderDraggableHeader('Project Name', 'projectName'),
    cell: ({ row }) => row.getValue('projectName'),
  },
  {
    accessorKey: 'versionName',
    header: ({ column }) => renderDraggableHeader('Version', 'versionName'),
    cell: ({ row }) => row.getValue('versionName'),
  },
  {
    accessorKey: 'assignedToUserName',
    header: ({ column }) => renderDraggableHeader('Assignee', 'assignedToUserName'),
    cell: ({ row }) => row.getValue('assignedToUserName'),
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => h('div', 'Subject'),
    cell: ({ row }) => row.getValue('subject'),
  },
  {
    accessorKey: 'statusName',
    header: ({ column }) => renderDraggableHeader('Status', 'statusName'),
    cell: ({ row }) => row.getValue('statusName'),
  },
  {
    accessorKey: 'impactNote',
    header: ({ column }) => h('div', 'Impact Note'),
    cell: ({ row }) => h('div', { 
      innerHTML: row.getValue('impactNote') as string, 
      class: 'prose dark:prose-invert max-w-none text-sm' 
    }),
  },
  {
    accessorKey: 'created_on',
    header: ({ column }) => h('div', 'Created On'),
    cell: ({ row }) => {
      const date = row.getValue('created_on') as string;
      return date ? new Date(date).toLocaleDateString() : '-';
    },
  },
  {
    accessorKey: 'updated_on',
    header: ({ column }) => h('div', 'Updated On'),
    cell: ({ row }) => {
      const date = row.getValue('updated_on') as string;
      return date ? new Date(date).toLocaleDateString() : '-';
    },
  },
];
</script>

<style scoped></style>

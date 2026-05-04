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
              <div v-if="modelValue?.length" class="flex gap-2 items-center overflow-x-auto">
                <UBadge
                  v-for="v in modelValue"
                  :key="v.id"
                  variant="subtle"
                  size="lg"
                >
                  {{ v.name }}
                  <template #trailing>
                    <UIcon name="i-heroicons-x-mark" class="cursor-pointer" @click.stop="removeSelectedVersion(v)" />
                  </template>
                </UBadge>
              </div>
              <span v-else class="text-gray-500 dark:text-gray-400">Select Versions</span>
            </template>
          </USelectMenu>
        </div>
        <div class="flex items-center gap-2">
          <UButton icon="i-heroicons-magnifying-glass" @click="handleGetIssuesByVersion">Search</UButton>
          <UButton icon="i-heroicons-document-arrow-down" variant="outline" @click="exportToExcel">Export Excel</UButton>
        </div>
      </div>
      
      <!-- Group Panel Drop Zone -->
      <div 
        class="w-full min-h-10 border-2 border-dashed rounded-lg flex items-center px-4 transition-colors"
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
      ref="issuesTable"
      :data="IssuesByVersions" 
      :columns="columns"
      v-model:grouping="groupedColumns"
      :grouping-options="{
        groupedColumnMode: 'remove',
        getGroupedRowModel: getGroupedRowModel()
      }"
      :ui="{ td: 'empty:p-0' }"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { useRuntimeConfig } from "#app";
import type { TableColumn } from "@nuxt/ui";
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { getGroupedRowModel } from '@tanstack/vue-table'
import type { Cell, Row, Table } from '@tanstack/vue-table'

const config = useRuntimeConfig();
const baseUrl = config.public.redmineUrl;

const { data: dataversions } = await useRedmineAPI().getVersions<Version[]>();
const versions = computed(() => dataversions.value ?? []);

const selectedVersions = ref<Version[]>([]);
const IssuesByVersions = ref<Issue[]>([]);
const issuesTable = useTemplateRef<{ tableApi: Table<Issue> }>('issuesTable')

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

const removeSelectedVersion = (v: Version) => {
  selectedVersions.value = selectedVersions.value.filter(sv => sv.id !== v.id)
}

const stripHtml = (html: string | null | undefined): string => {
  if (!html) {
    return ''
  }

  if (import.meta.client) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  }

  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const flattenLeafRows = <TData>(rows: Row<TData>[]): TData[] => {
  const result: TData[] = []

  const visitRow = (row: Row<TData>): void => {
    if (row.getIsGrouped()) {
      row.subRows.forEach(visitRow)
      return
    }

    result.push(row.original)
  }

  rows.forEach(visitRow)
  return result
}

const getExportIssues = (): Issue[] => {
  const tableApi = issuesTable.value?.tableApi
  if (!tableApi) {
    return IssuesByVersions.value
  }

  return flattenLeafRows(tableApi.getPrePaginationRowModel().rows)
}

const formatExportDate = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString()
}

const exportToExcel = (): void => {
  const exportIssues = getExportIssues()
  if (!exportIssues.length) {
    return
  }

  const rows = exportIssues.map((issue) => ({
    ID: issue.id,
    Project: issue.projectName || '',
    Version: issue.versionName || '',
    Assignee: issue.assignedToUserName || '',
    Subject: issue.subject || '',
    Status: issue.statusName || '',
    ImpactNote: stripHtml(issue.impactNote),
    CreatedOn: formatExportDate(issue.created_on),
    UpdatedOn: formatExportDate(issue.updated_on)
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 60 },
    { wch: 18 },
    { wch: 50 },
    { wch: 14 },
    { wch: 14 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Issues')

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const fileName = `issues_${new Date().toISOString().slice(0, 10)}.xlsx`
  saveAs(blob, fileName)
}

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
            color: 'neutral',
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
    meta: {
      class: {
        td: 'w-8 overflow-visible'
      },
      colspan: {
        td: (cell: Cell<Issue, unknown>) => {
          return cell.row.getIsGrouped() ? String(cell.row.getAllCells().length) : '1'
        }
      }
    },
  },
  {
    accessorKey: 'projectName',
    header: ({ column }) => renderDraggableHeader('Project Name', 'projectName'),
    cell: ({ row }) => row.getValue('projectName'),
    meta: {
      class: {
          td: 'w-48 whitespace-normal',
      },
    },
  },
  {
    accessorKey: 'versionName',
    header: ({ column }) => renderDraggableHeader('Version', 'versionName'),
    cell: ({ row }) => row.getValue('versionName'),
    meta: {
      class: {
          td: 'w-16 whitespace-normal',
      },
    },
  },
  {
    accessorKey: 'assignedToUserName',
    header: ({ column }) => renderDraggableHeader('Assignee', 'assignedToUserName'),
    cell: ({ row }) => row.getValue('assignedToUserName'),
    meta: {
      class: {
          td: 'w-16 whitespace-normal',
      },
    },
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => h('div', 'Subject'),
    cell: ({ row }) => row.getValue('subject'),
    meta: {
      class: {
          td: 'w-96 min-w-[30rem] whitespace-normal',
      },
    },
  },
  {
    accessorKey: 'statusName',
    header: ({ column }) => renderDraggableHeader('Status', 'statusName'),
    cell: ({ row }) => row.getValue('statusName'),
    meta: {
      class: {
          td: 'w-16 whitespace-normal',
      },
    },
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

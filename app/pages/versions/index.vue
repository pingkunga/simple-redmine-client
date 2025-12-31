<template>
  <div>
    <h1>Versions ({{ dataversions.length }}) </h1>
    <!-- <pre>{{ versions }}</pre> -->
    <div class="px-4 py-3.5 border-b border-accented">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <UInput v-model="searchText" class="max-w-sm" placeholder="Filter..." />
          <div class="flex items-center gap-2">
            <USelect v-model="selectedStatuses" :items="versionStatuses" multiple placeholder="Filter by status..." class="w-48" />
          </div>
        </div>
        <UButton @click="openNewDialog">New Item</UButton>
      </div>
    </div>

    <UTable ref="table" :data="dataversions || []" :columns="columns" :loading="loading" loading-color="primary"
      loading-animation="carousel" v-model:global-filter="searchText" v-model:pagination="pagination" :column-filters="columnFilters"
      :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }">
    </UTable>

    <div class="flex justify-end border-t border-default pt-4 px-4">
      <UPagination v-model:page="currentPage" :items-per-page="table?.tableApi?.getState().pagination.pageSize"
        :total="table?.tableApi?.getFilteredRowModel().rows.length" />
    </div>


    <UModal v-model:open="isModalOpen" :title="formTitle" size="md">
      <template #body>
        <UForm :state="editedItem" @submit="save" class="space-y-4">
          <!-- Row 1: Version / Sharing / Due Date -->
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Version" name="name">
              <UInput v-model="editedItem.name" class="w-full" />
            </UFormField>
            <UFormField label="Sharing" name="sharing">
              <USelect v-model="editedItem.sharing" :items="versionShares" class="w-full" />
            </UFormField>
            <UFormField label="Due Date" name="due_date">
              <UInput type="date" v-model="editedItem.due_date" class="w-full" />
            </UFormField>
          </div>
          
          <!-- Row 2: Status (1/3) / Wiki Page (2/3) -->
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Status" name="status">
              <USelect v-model="editedItem.status" :items="versionStatuses" class="w-full" />
            </UFormField>
            <div class="col-span-2">
              <UFormField label="Wiki Page" name="wiki_page_title">
                <UInput v-model="editedItem.wiki_page_title" class="w-full" />
              </UFormField>
            </div>
          </div>
          
          <!-- Row 3: Description (full width) -->
          <UFormField label="Description" name="description" class="w-full">
            <UTextarea v-model="editedItem.description" class="w-full" />
          </UFormField>
          
          <div class="flex gap-2 mt-6">
            <UButton type="submit">Save</UButton>
            <UButton variant="outline" @click="close">Cancel</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { ColumnFilter } from '@tanstack/vue-table'
import { UBadge, UButton } from '#components'
import { tr } from "@nuxt/ui/runtime/locale/index.js";

const table = useTemplateRef('table')

const selectedStatuses = ref<string[]>([]);

const columnFilters = ref<ColumnFilter[]>([]);

const { versionStatuses, versionShares } = useRedmineAPI();

const dataversions = ref<Version[]>([]);

const loading = ref(false);

const fetchVersions = async (pIsClear?: boolean) => {
  loading.value = true;
  try {
    const { data } = await useRedmineAPI().getVersions<Version[]>();
    dataversions.value = data.value || [];
  } catch (err) {
    console.error("Failed to fetch versions:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchVersions();
});

watch(selectedStatuses, () => {
  if (selectedStatuses.value.length === 0) {
    columnFilters.value = [];
  } else {
    columnFilters.value = [{ id: 'status', value: selectedStatuses.value }];
  }
});

//const searchText = ref("");
const searchText = ref<string | undefined>(undefined);

// ================================================================
// PAGINATION
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
});

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
// PAGINATION
// ================================================================


// Add this helper function at the top of the script
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const columns: TableColumn<Version>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => h('div', { class: 'text-left' }, 'ID'),
    cell: ({ row }) => h('div', { class: 'text-left font-medium' }, `#${row.getValue('id')}`),
    size: 80
  },
  {
    accessorKey: 'name',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Version'),
    cell: ({ row }) => h('div', { class: 'text-left' }, row.getValue('name')),
    size: 150
  },
  {
    accessorKey: 'projectname',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Project Name'),
    cell: ({ row }) => h('div', { class: 'text-left' }, row.getValue('projectname') || '-'),
    size: 150
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Description'),
    cell: ({ row }) => h('div', { class: 'text-left' }, row.getValue('description') || '-'),
    size: 200,
    maxSize: 200
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const color = {
        open: 'success' as const,
        locked: 'warning' as const,
        closed: 'error' as const
      }[status] || 'neutral'

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => status)
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    size: 100
  },
  {
    accessorKey: 'due_date',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Due Date'),
    cell: ({ row }) => {
      const date = row.getValue('due_date') as string
      return h('div', { class: 'text-left' }, formatDate(date))
    },
    size: 120
  },
  {
    accessorKey: 'sharing',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Sharing'),
    cell: ({ row }) => h('div', { class: 'text-left capitalize' }, row.getValue('sharing')),
    size: 100
  },
  // {
  //   accessorKey: 'created_on',
  //   header: ({ column }) => h('div', { class: 'text-left' }, 'Created On'),
  //   cell: ({ row }) => {
  //     const date = row.getValue('created_on') as string
  //     return h('div', { class: 'text-left' }, new Date(date).toLocaleDateString())
  //   },
  //   size: 120
  // },
  // {
  //   accessorKey: 'updated_on',
  //   header: ({ column }) => h('div', { class: 'text-left' }, 'Updated On'),
  //   cell: ({ row }) => {
  //     const date = row.getValue('updated_on') as string
  //     return h('div', { class: 'text-left' }, new Date(date).toLocaleDateString())
  //   },
  //   size: 120
  // },
  {
    id: 'actions',
    header: ({ column }) => h('div', { class: 'text-left' }, 'Actions'),
    cell: ({ row }) => h('div', { class: 'flex gap-2' }, [
      h(UButton, { size: 'xs', variant: 'outline', onClick: () => editItem(row.original) }, 'Edit'),
      h(UButton, { size: 'xs', variant: 'outline', color: 'error', onClick: () => deleteItem(row.original) }, 'Delete')
    ]),
    size: 150
  }
]



//================================================================
// CRUD
const editedIndex = ref(-1);
const isModalOpen = ref(false);
const formTitle = computed(() =>
  editedIndex.value === -1 ? "New Version" : "Edit Version"
);

const defaultVersion: Version = {
  id: -1,
  name: "",
  description: "",
  status: "",
  due_date: "",
  sharing: "",
  wiki_page_title: "",
  created_on: "",
  updated_on: "",
  projectid: 0,
  projectname: "",
};

const editedItem = ref<Version>({ ...defaultVersion });

const editItem = (row: Version) => {
  editedIndex.value = dataversions.value?.indexOf(row) ?? -1;
  editedItem.value = { ...row };
  isModalOpen.value = true;
};

const openNewDialog = () => {
  editedIndex.value = -1;
  editedItem.value = { ...defaultVersion };
  isModalOpen.value = true;
};

const close = () => {
  editedItem.value = { ...defaultVersion };
  isModalOpen.value = false;
};

const save = async () => {
  try {
    if (editedIndex.value === -1) {
      // Create new item
      await useRedmineAPI().addVersion(editedItem.value);
    } else {
      // Update existing item
      await useRedmineAPI().updateVersion(editedItem.value);
    }
    //refresh data
    await fetchVersions(true);
    close();
  } catch (error) {
    console.error("Failed to save version:", error);
  }
};

const deleteItem = async (row: Version) => {
  if (confirm("Are you sure you want to delete this item?")) {
    try {
      await useRedmineAPI().deleteVersion(row.id.toString());
      //refresh data
      await fetchVersions(true);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  }
};
</script>

<style scoped>
.text-secondary {
  color: #16b9eb !important;
  /* Example color, change as needed */
  font-weight: bold;
  /* Example style, change as needed */
}

.open {
  background: #026134;
}

.locked {
  background: #865101;
}

.closed {
  background: #ec291b;
}
</style>

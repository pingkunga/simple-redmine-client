<template>
  <div>Versions</div>
  <v-text-field
    v-model="searchText"
    label="Search"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    hide-details
    single-line
  ></v-text-field>

  <!-- <pre> {{ selectVersionStatus }}</pre> -->
  <v-data-table :headers="headers" :items="versions" :search="searchText">
    <template v-slot:item.actions="{ item }">
      <v-icon class="me-2" size="small" @click="editItem(item)"> mdi-pencil </v-icon>
      <v-icon size="small" @click="deleteItem(item)"> mdi-delete </v-icon>
    </template>

    <template v-slot:top>
      <v-toolbar flat color="primary">
        <v-toolbar-title>Versions </v-toolbar-title>
        <!-- Chips for filtering -->
        <v-chip-group selected-class="text-secondary" multiple id="chips-container">
          <v-chip
            v-for="versionStatus in versionStatuses"
            :key="String(versionStatus)"
            @click="toggleVersionStatus(versionStatus)"
            :class="versionStatus"
          >
            {{ versionStatus }}
          </v-chip>
        </v-chip-group>

        <v-spacer></v-spacer>
        <!-- NEW / EDIT FORM -->
        <v-dialog v-model="editedDialog" max-width="500px">
          <template v-slot:activator="{ props }">
            <v-btn class="mb-2" color="white" v-bind="props"> New Item </v-btn>
          </template>
          <v-card>
            <v-card-title>
              <span class="text-h5">{{ formTitle }}</span>
            </v-card-title>

            <v-card-text>
              <v-container>
                <v-row>
                  <v-col cols="12" md="6" sm="6">
                    <v-text-field
                      label="Version"
                      v-if="editedItem"
                      v-model="editedItem.name"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6" sm="6">
                    <v-combobox
                      :items="versionStatuses"
                      label="Status"
                      v-if="editedItem"
                      v-model="editedItem.status"
                    ></v-combobox>
                  </v-col>
                  <v-col cols="12" md="12" sm="6">
                    <v-text-field
                      label="Description"
                      v-if="editedItem"
                      v-model="editedItem.description"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="12" sm="6">
                    <v-text-field
                      label="Wiki Page"
                      v-if="editedItem"
                      v-model="editedItem.wiki_page_title"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6" sm="6">
                    <v-text-field
                      type="date"
                      label="Due Date"
                      v-if="editedItem"
                      v-model="editedItem.due_date"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6" sm="6">
                    <v-combobox
                      :items="versionShares"
                      label="Sharing"
                      v-if="editedItem"
                      v-model="editedItem.sharing"
                    ></v-combobox>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue-darken-1" variant="text" @click="close"> Cancel </v-btn>
              <v-btn color="blue-darken-1" variant="text" @click="saveItem"> Save </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-dialog v-model="dialogDelete" max-width="500px">
          <v-card>
            <v-card-title class="text-h5"
              >Are you sure you want to delete this item?</v-card-title
            >
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue-darken-1" variant="text" @click="closeDelete"
                >Cancel</v-btn
              >
              <v-btn color="blue-darken-1" variant="text" @click="deleteItemConfirm"
                >OK</v-btn
              >
              <v-spacer></v-spacer>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-toolbar>
    </template>
  </v-data-table>

  <!-- Snackbar for error notifications -->
  <v-snackbar v-model="snackbar" :timeout="5000" top right>
    {{ snackbarMessage }}
    <v-btn color="red" @click="snackbar = false">Close</v-btn>
  </v-snackbar>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";

const selectVersionStatus = ref<string[]>([]);

const { versionStatuses, versionShares } = useRedmineAPI();

const { data: dataversions, error } = await useRedmineAPI().getVersions<Version[]>();

const versions = computed(() => {
  if (selectVersionStatus.value.length === 0) {
    return dataversions.value ?? [];
  }
  return (
    dataversions.value?.filter((version) =>
      selectVersionStatus.value.includes(version.status)
    ) ?? []
  );
});

const toggleVersionStatus = (versionStatus: string) => {
  const index = selectVersionStatus.value.indexOf(versionStatus);
  if (index === -1) {
    selectVersionStatus.value.push(versionStatus);
  } else {
    selectVersionStatus.value.splice(index, 1);
  }
};

const searchText = ref("");

const headers = [
  { title: "id", key: "id" },
  { title: "Version", key: "name" },
  { title: "Actions", key: "actions", sortable: false },
  { title: "Project Name", key: "projectname" },
  { title: "Description", key: "description" },
  { title: "status", key: "status" },
  { title: "due date", key: "due_date" },
  { title: "sharing type", key: "sharing" },
  { title: "Created on", key: "created_on" },
  { title: "Updated on", key: "updated_on" },
];

//================================================================
// CRUD
const { customYYYYMMDDDateFormatter } = useCustomFormatter();
const editedDialog = ref(false);
const editedIndex = ref(-1);
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

const editedItem = ref<Version>(defaultVersion);

const editItem = (item: Version) => {
  editedIndex.value = dataversions.value?.indexOf(item) ?? -1;
  editedItem.value = Object.assign({}, item);
  editedDialog.value = true;
};

const close = () => {
  //clear editedItem
  editedItem.value = Object.assign({}, defaultVersion);
  editedDialog.value = false;
};

const saveItem = async () => {
  try {
    if (editedIndex.value === -1) {
      // Create new item
      await useRedmineAPI().addVersion(editedItem.value);
    } else {
      // Update existing item
      await useRedmineAPI().updateVersion(editedItem.value);
    }
    //refresh data
    editedDialog.value = false;
  } catch (error) {
    console.error("Failed to save version:", error);
    snackbarMessage.value = "Error: " + (error as NuxtError).statusMessage;
    snackbar.value = true;
  }
};

const dialogDelete = ref(false);
const deleteItem = (item: Version) => {
  editedIndex.value = dataversions.value?.indexOf(item) ?? -1;
  editedItem.value = Object.assign({}, item);
  dialogDelete.value = true;
};

const deleteItemConfirm = async () => {
  try {
    if (editedIndex.value === -1) {
      return;
    }
    await useRedmineAPI().deleteVersion(editedItem.value.id.toString());
    //refresh data
    dialogDelete.value = false;
  } catch (error) {
    console.error("Failed to delete version:", error);
    snackbarMessage.value = "Error: " + (error as NuxtError).statusMessage;
    snackbar.value = true;
  }
};

const closeDelete = () => {
  dialogDelete.value = false;
};

//================================================================
const snackbar = ref(false);
const snackbarMessage = ref("");
</script>

<style scoped>
.text-secondary {
  color: #16b9eb !important; /* Example color, change as needed */
  font-weight: bold; /* Example style, change as needed */
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

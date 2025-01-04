<template>
  <div>Issues</div>
  <v-row>
    <v-col cols="12" sm="6" md="10">
      <v-combobox
        multiple
        v-model="selectedVersions"
        @update:model-value="updateSelectedItem"
        :items="versions"
        item-title="name"
        item-value="id"
        label="Selected Versions"
        return-object
        chips
        closable-chips
        clearable
        @keyup.enter="handleGetIssuesByVersion"
      ></v-combobox>
    </v-col>
    <v-col cols="12" sm="auto" md="auto">
      <!-- v-btn component -->
      <v-btn icon @click="handleGetIssuesByVersion" hint="Search">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
    </v-col>
  </v-row>
  <!-- <pre>{{ selectedVersions }}</pre> -->
  <v-data-table
    :headers="headers"
    :items="IssuesByVersions"
    :group-by="groupBy"
  ></v-data-table>
</template>

<script setup lang="ts">
import type { Title } from "#build/components";
import type { RefSymbol } from "@vue/reactivity";

const { data: dataversions, error } = await useRedmineAPI().getVersions<Version[]>();
const versions = dataversions.value ?? [];

console.log(versions);
const selectedVersions = ref<Version[]>([]);
const IssuesByVersions = ref<Issue[]>([]);

const selectedVersionIds = computed(() => {
  return selectedVersions.value.map((version) => version.id).join(", ");
});

const updateSelectedItem = (values: (string | Version)[]) => {
  //check select item is type Version or not
  //split values into string and Version
  const selectedItems = values.map((value) => {
    if (typeof value === "string") {
      return versions.find((item) => item.name === value.trim());
    }
    return value;
  });

  selectedVersions.value = selectedItems.filter((item) => item) as Version[];
};

//get issue by version
const handleGetIssuesByVersion = async () => {
  if (!selectedVersionIds.value) {
    return;
  }
  const { data } = await useRedmineAPI().getIssuesByVersion<Issue[]>(
    selectedVersionIds.value
  );
  console.log(IssuesByVersions);
  IssuesByVersions.value = data.value ?? [];
};
const groupBy = [
  {
    key: "versionName",
    order: "asc" as const,
  },
];
// Define the headers for the v-data-table, excluding the id field
const headers = [
  { title: "#", key: "id" },
  { title: "Project Name", key: "projectName" },
  { title: "version", key: "versionName" },
  { title: "Assignee", key: "assignedToUserName" },
  { title: "Subject", key: "subject" },
  { title: "Status", key: "statusName" },
  { title: "Impact Note", key: "impactNote" },
  { title: "Created On", key: "created_on" },
  { title: "Updated On", key: "updated_on" },
];
</script>

<style scoped></style>

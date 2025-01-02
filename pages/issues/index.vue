<template>
  <div>Issues</div>
  <v-combobox
    multiple
    v-model="selectedVersions"
    :items="versions"
    item-title="name"
    item-value="id"
    label="Selected Versions"
    return-object
    chips
    clearable
    @keyup.enter="handleGetIssuesByVersion"
  ></v-combobox>
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

const {
  data: VersionsResponse,
  error,
} = await useRedmineAPI().getVersions<VersionsResponse>();

const versions: Version[] = VersionsResponse.value?.versions || [];
console.log(versions);
const selectedVersions = ref<Version[]>([]);
const IssuesByVersions = ref<Issue[]>([]);

const selectedVersionIds = computed(() => {
  return selectedVersions.value.map((version) => version.id).join(", ");
});

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

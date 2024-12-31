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
  <v-data-table :items="VersionsResponse!.versions" :search="searchText"></v-data-table>
</template>

<script setup lang="ts">
const {
  data: VersionsResponse,
  error,
} = await useRedmineAPI().getVersions<VersionsResponse>();
const searchText = ref("");
</script>

<style scoped></style>

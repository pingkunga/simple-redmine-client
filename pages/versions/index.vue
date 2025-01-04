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
  <v-data-table :items="versions" :search="searchText"></v-data-table>
</template>

<script setup lang="ts">
const { data: dataversions, error } = await useRedmineAPI().getVersions<Version[]>();
const versions = dataversions.value ?? [];
const searchText = ref("");
</script>

<style scoped></style>

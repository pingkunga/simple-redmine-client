<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <v-combobox
    single
    v-model="selectedProject"
    :items="projects"
    item-title="name"
    item-value="id"
    label="Select Projects"
    return-object
    chips
    closable-chips
    clearable
  ></v-combobox>
  <div>
    {{ selectedProject }}
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();

const { data: dataProjects, error } = await useRedmineAPI().getProject<Project[]>();
const projects = dataProjects.value ?? [];

const selectedProject = ref<Version>();
</script>

<style scoped></style>

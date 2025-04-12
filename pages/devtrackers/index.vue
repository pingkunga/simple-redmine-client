<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <v-combobox
    single
    v-model="selectedProject"
    @update:model-value="updateProjectMember"
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
  <v-combobox
    single
    v-model="selectedAssignee"
    :items="projectMembers"
    item-title="name"
    item-value="id"
    label="Select Assignee"
    return-object
    chips
    closable-chips
    clearable
  >
  </v-combobox>
  <div>
    {{ selectedAssignee }}
  </div>
</template>

<script setup lang="ts">
const selectedProject = ref<Project>();
const selectedAssignee = ref<ProjectMemberShip>();
const projectMembers = ref<ProjectMemberShip[]>([]);

const { data: dataProjects, error } = await useRedmineAPI().getProject<Project[]>();
const projects = dataProjects.value ?? [];

const updateProjectMember = async (project: Project) => {
  console.log("Selected project:", project);

  if (project) {
    const { data: dataProjects, error } = await useRedmineAPI().getProjectMemberShip<
      ProjectMemberShip[]
    >(project.id);
    projectMembers.value = dataProjects.value ?? [];
  }
};
</script>

<style scoped></style>

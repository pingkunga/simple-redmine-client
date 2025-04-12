<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <v-combobox
    single
    v-model="selectedProject"
    @update:model-value="projectChange"
    :items="projects"
    item-title="name"
    item-value="id"
    label="Select Project"
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
  <v-combobox
    single
    v-model="selectedVersion"
    :items="versions"
    item-title="name"
    item-value="id"
    label="Select Version"
    return-object
    chips
    closable-chips
    clearable
  >
  </v-combobox>
  <div>
    {{ selectedVersion }}
  </div>
  <v-text-field
    v-model="trackerTitle"
    label="Tracker Title"
    :rules="[validateTitleInput]"
    required
    hint="[SITENAME][MODULE][IMPACT] Your Desire Title or [SITENAME][MODULE][NOIMPACT] Your Desire Title"
  >
  </v-text-field>
</template>

<script setup lang="ts">
const projects = ref<Project[]>();
const projectMembers = ref<ProjectMemberShip[]>([]);
const versions = ref<Version[]>([]);

const selectedProject = ref<Project>();
const selectedAssignee = ref<ProjectMemberShip>();
const selectedVersion = ref<Version>();
const trackerTitle = ref<string>("");

const { data: dataProjects, error } = await useRedmineAPI().getProject<Project[]>();
projects.value = dataProjects.value ?? [];

const projectChange = async (project: Project) => {
  console.log("Selected project:", project);

  if (project) {
    const {
      data: dataProjects,
      error: errorProjects,
    } = await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(project.id);
    projectMembers.value = dataProjects.value ?? [];

    const {
      data: dataVersions,
      error: errorVersions,
    } = await useRedmineAPI().getVersionByProjectId<Version[]>(project.id);
    versions.value = dataVersions.value ?? [];
  }
};

//:rules="[validateTitleInput]"
const validateTitleInput = (value: string) => {
  const pattern = /^\[[A-Za-z0-9]+\]\[[A-Za-z0-9]+\]\[(IMPACT|NOIMPACT)]\s.+$/;
  return pattern.test(value) || "Input must match the required format.";
};
</script>

<style scoped></style>

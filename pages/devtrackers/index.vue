<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <v-form ref="form" v-model="isFormValid">
    <v-combobox
      single
      v-model="selectTracker"
      :items="devTrackers"
      item-title="name"
      item-value="id"
      label="Select Tracker"
      :return-object="false"
      clearable
      :rules="[(v) => !!v || 'Tracker is required']"
      required
    ></v-combobox>
    <div>
      {{ selectTracker }}
    </div>
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
      :rules="[(v) => !!v || 'Project is required']"
      required
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
      :rules="[(v) => !!v || 'Project Member is required']"
      required
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
      :rules="[(v) => !!v || 'Version is required']"
      required
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
    <v-btn color="primary" @click="handleSubmit">Submit</v-btn>
    <v-btn color="blue-darken-1" @click="handleReset">Clear</v-btn>
  </v-form>
</template>

<script setup lang="ts">
import type { VForm } from "vuetify/components";

const { devTrackers } = useRedmineAPI();

const form = ref<VForm | null>(null);
const isFormValid = ref(false);

const projects = ref<Project[]>();
const projectMembers = ref<ProjectMemberShip[]>([]);
const versions = ref<Version[]>([]);

const selectTracker = ref<Number | null>();
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

// ==============================
// FORM ACTION
// ==============================
const handleSubmit = async () => {
  const { valid } = (await form.value?.validate()) ?? { valid: false };
  if (!valid) {
    console.log("Form validation failed");
    return;
  }

  console.log("Form submitted successfully");
};

const handleReset = () => {
  isFormValid.value = false;
  selectTracker.value = null;
  selectedProject.value = undefined;
  selectedAssignee.value = undefined;
  selectedVersion.value = undefined;
  trackerTitle.value = "";
};
</script>

<style scoped></style>

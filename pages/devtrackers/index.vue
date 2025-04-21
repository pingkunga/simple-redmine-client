<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <client>
    <!--check if found access key in local storage-->
    <div v-if="!accessKey" style="color: red">
      Please set your access key in Client Setting
    </div>
    <div v-else>
      <v-container>
        <v-text-field
          label="Encrypt Access Key"
          v-model="accessKey"
          readonly
          type="Password"
        ></v-text-field>
        <v-switch
          color="primary"
          label="Use Server Token"
          v-model="isUseServerToken"
          @change="projectsInit"
        ></v-switch>
      </v-container>
    </div>
  </client>
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
    <v-text-field
      v-model="trackerTitle"
      label="Tracker Title - Pattern [SITENAME][MODULE][IMPACT] Your Desire Title or [SITENAME][MODULE][NOIMPACT] Your Desire Title"
      :rules="[validateTitleInput]"
      required
      hint="[SITENAME][MODULE][IMPACT] Your Desire Title or [SITENAME][MODULE][NOIMPACT] Your Desire Title"
      persistent-hint
    ></v-text-field>
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
      :rules="[
        (v) => !!v || 'Project is required',
        (v) => isItemInListByType(projects, 'id', v) || 'Project must be in the list',
      ]"
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
      :rules="[
        (v) => !!v || 'Project Member is required',
        (v) =>
          isItemInListByType(projectMembers, 'id', v) ||
          'Project Member must be in the list',
      ]"
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
      :rules="[
        (v) => !!v || 'Version is required',
        (v) => isItemInListByType(versions, 'id', v) || 'Version must be in the list',
      ]"
      required
    >
    </v-combobox>
    <div>
      {{ selectedVersion }}
    </div>

    <v-btn color="primary" @click="handleSubmit">Submit</v-btn>
    <v-btn color="blue-darken-1" @click="handleReset">Clear</v-btn>
  </v-form>
  <!-- Snackbar for error notifications -->
  <v-snackbar v-model="snackbar" :timeout="5000" top right :color="snackbarColor">
    {{ snackbarMessage }}
    <v-btn color="white" @click="snackbar = false">Close</v-btn>
  </v-snackbar>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import type { VForm } from "vuetify/components";

const accessKey = ref<string | null>(null);
const isUseServerToken = ref(false);

const { devTrackers, YourOwnRedmineAPI } = useRedmineAPI();
const { isItemInListByType } = useCommonUtil();

const form = ref<VForm | null>(null);
const isFormValid = ref(false);

const projects = ref<Project[]>();
const projectMembers = ref<ProjectMemberShip[]>([]);
const versions = ref<Version[]>([]);

const selectTracker = ref<number | null>();
const selectedProject = ref<Project>();
const selectedAssignee = ref<ProjectMemberShip>();
const selectedVersion = ref<Version>();
const trackerTitle = ref<string>("");

const { data: dataProjects, error } = await useRedmineAPI().getProject<Project[]>();
projects.value = dataProjects.value ?? [];

// ===============================
// LIFECYCLE HOOKS
// ===============================
onMounted(() => {
  const { retriveAccessKey } = useClientUtil();
  accessKey.value = retriveAccessKey() || "";

  projectsInit();
});

const projectsInit = async () => {
  try {
    const headers: Record<string, string> = {
      [YourOwnRedmineAPI]: accessKey.value ?? "",
    };

    const { data: dataProjects } = isUseServerToken.value
      ? await useRedmineAPI().getProject<Project[]>()
      : await useRedmineAPI().getProject<Project[]>(headers);

    projects.value = dataProjects.value ?? [];

    //clear selected project, assignee, and version
    selectedProject.value = undefined;
    selectedAssignee.value = undefined;
    selectedVersion.value = undefined;
  } catch (err) {
    console.error("Error fetching projects:", error);
    snackbarMessage.value = "Error fetching projects. Please try again.";
    snackbarColor.value = "error";
    snackbar.value = true;
  }
};

const projectChange = async (project: Project) => {
  console.log("Selected project:", project);

  if (project) {
    const headers: Record<string, string> = {
      [YourOwnRedmineAPI]: accessKey.value ?? "",
    };

    const {
      data: dataProjects,
      error: errorProjects,
    } = await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(
      project.id,
      headers
    );
    projectMembers.value = dataProjects.value ?? [];

    const {
      data: dataVersions,
      error: errorVersions,
    } = await useRedmineAPI().getVersionByProjectId<Version[]>(project.id, headers);
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

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("");

const handleSubmit = async () => {
  try {
    if (!accessKey.value) {
      snackbarMessage.value = "Please set your access key in Client Setting";
      snackbarColor.value = "error";
      snackbar.value = true;
      return;
    }

    const { valid } = (await form.value?.validate()) ?? { valid: false };
    if (!valid) {
      console.log("Form validation failed");
      return;
    }

    console.log("Form submitted successfully");

    const headers: Record<string, string> = {
      [YourOwnRedmineAPI]: accessKey.value ?? "",
    };

    const devTrackerReq: DevTrackerRequest = useRedmineAPI().createDevTrackerRequest(
      selectTracker.value ?? 0,
      selectedProject.value ?? ({} as Project),
      selectedAssignee.value ?? ({} as ProjectMemberShip),
      selectedVersion.value ?? ({} as Version),
      trackerTitle.value
    );

    const IssueId = isUseServerToken.value
      ? await useRedmineAPI().createDevTracker(devTrackerReq)
      : await useRedmineAPI().createDevTracker(devTrackerReq, headers);

    console.log("Issue created with ID:", IssueId);

    snackbarMessage.value = "Issue created with ID: " + IssueId;
    snackbarColor.value = "success";
    snackbar.value = true;

    handleReset();
  } catch (error) {
    console.error("Failed to save issue:", error);
    const nError = error as NuxtError;
    const errorMessage =
      (nError.data as { message: string })?.message || nError.statusMessage;
    snackbarMessage.value = "Error: " + errorMessage;
    snackbarColor.value = "error";
    snackbar.value = true;
  }
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

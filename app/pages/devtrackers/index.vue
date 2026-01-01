<template>
  <div>Dev Trackers (Program Spec / Defect)</div>
  <ClientOnly>
    <!--check if found access key in local storage-->
    <div v-if="!accessKey" class="text-red-500 mb-4">
      Please set your access key in Client Setting
    </div>
    <div v-else class="mb-8 space-y-8 pt-4">
      <UFormGroup label="Encrypt Access Key">
        <UInput
          v-model="accessKey"
          readonly
          type="password"
          icon="i-heroicons-lock-closed"
        />
      </UFormGroup>
      <div class="flex items-center gap-6 pt-4">
        <USwitch
          v-model="isUseServerToken"
          @update:model-value="projectsInit"
        />
        <span class="text-sm text-gray-700 dark:text-gray-200">Use Server Token</span>
      </div>
    </div>
  </ClientOnly>
  <UForm :schema="schema" :state="state" class="flex flex-col gap-6" @submit="handleSubmit">
    <UFormField label="Select Tracker" name="selectTracker" required>
      <USelectMenu
        v-model="state.selectTracker"
        :items="devTrackers"
        label-key="name"
        value-key="id"
        placeholder="Select Tracker"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Tracker Title" name="trackerTitle" required help="[SITENAME][MODULE][IMPACT] Your Desire Title or [SITENAME][MODULE][NOIMPACT] Your Desire Title">
      <UInput
        v-model="state.trackerTitle"
        placeholder="Tracker Title - Pattern [SITENAME][MODULE][IMPACT] Your Desire Title..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Select Project" name="selectedProject" required>
      <USelectMenu
        v-model="state.selectedProject"
        :items="projects"
        label-key="name"
        placeholder="Select Project"
        @update:model-value="projectChange"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Select Assignee" name="selectedAssignee" required>
      <USelectMenu
        v-model="state.selectedAssignee"
        :items="projectMembers"
        label-key="name"
        placeholder="Select Assignee"
        class="w-full"
        virtualize
      />
    </UFormField>

    <UFormField label="Select Version" name="selectedVersion" required>
      <USelectMenu
        v-model="state.selectedVersion"
        :items="versions"
        label-key="name"
        placeholder="Select Version"
        class="w-full"
        virtualize
      />
    </UFormField>

    <div class="flex gap-2 pt-4">
      <UButton 
        type="submit" 
        color="primary" 
        block 
        class="w-32 justify-center" >
        Submit
      </UButton>
      <UButton 
        color="neutral" 
        variant="solid" 
        block 
        class="w-32 justify-center" 
        @click="handleReset">
        Clear
      </UButton>
    </div>
  </UForm>

  <!-- useToast is used instead of inline UToast component -->
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import { z } from 'zod';
import { h } from 'vue';

const accessKey = ref<string | null>(null);
const isUseServerToken = ref(false);

const config = useRuntimeConfig();
const baseUrl = config.public.redmineUrl;

const { devTrackers, YourOwnRedmineAPI } = useRedmineAPI();
const { isItemInListByType } = useCommonUtil();
const toast = useToast();

const projects = ref<Project[]>();
const projectMembers = ref<ProjectMemberShip[]>([]);
const versions = ref<Version[]>([]);

const state = reactive({
  selectTracker: undefined as number | undefined,
  trackerTitle: '',
  selectedProject: undefined as Project | undefined,
  selectedAssignee: undefined as ProjectMemberShip | undefined,
  selectedVersion: undefined as Version | undefined
})

const schema = z.object({
  selectTracker: z.number('Tracker is required'),
  trackerTitle: z.string().regex(/^\[[A-Za-z0-9]+\]\[[A-Za-z0-9]+\]\[(IMPACT|NOIMPACT)]\s.+$/, 'Input must match the required format.'),
  selectedProject: z.object({ id: z.number() }, { error: 'Project is required' }),
  selectedAssignee: z.object({ id: z.number() }, { error: 'Project Member is required' }),
  selectedVersion: z.object({ id: z.number() }, { error: 'Version is required' })
})

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
    state.selectedProject = undefined;
    state.selectedAssignee = undefined;
    state.selectedVersion = undefined;
  } catch (err) {
    console.error("Error fetching projects:", error);
    toast.add({ title: 'Error', description: 'Error fetching projects. Please try again.', color: 'error', icon: 'i-heroicons-exclamation-circle' });
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
    } = isUseServerToken.value
      ? await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(project.id)
      : await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(project.id, headers);
    projectMembers.value = dataProjects.value ?? [];

    const {
      data: dataVersions,
      error: errorVersions,
    } = isUseServerToken.value
      ? await useRedmineAPI().getVersionByProjectId<Version[]>(project.id)
      : await useRedmineAPI().getVersionByProjectId<Version[]>(project.id, headers);
    versions.value = dataVersions.value ?? [];
  }
};

// ==============================
// FORM ACTION
// ==============================

// notifications use `useToast()`

const handleSubmit = async () => {
  try {
    if (!accessKey.value) {
      toast.add({ title: 'Error', description: 'Please set your access key in Client Setting', color: 'error', icon: 'i-heroicons-exclamation-circle' });
      return;
    }

    // Form validation is handled by UForm

    console.log("Form submitted successfully");

    const headers: Record<string, string> = {
      [YourOwnRedmineAPI]: accessKey.value ?? "",
    };

    const devTrackerReq: DevTrackerRequest = useRedmineAPI().createDevTrackerRequest(
      state.selectTracker ?? 0,
      state.selectedProject ?? ({} as Project),
      state.selectedAssignee ?? ({} as ProjectMemberShip),
      state.selectedVersion ?? ({} as Version),
      state.trackerTitle
    );

    const IssueId = isUseServerToken.value
      ? await useRedmineAPI().createDevTracker(devTrackerReq)
      : await useRedmineAPI().createDevTracker(devTrackerReq, headers);

    console.log("Issue created with ID:", IssueId);
    const fullIssueUrl = `${baseUrl}/issues/${IssueId}`;

    toast.add({
      title: 'Success',
      description: h('span', { innerHTML: 'Issue created with ID: <a href="' + fullIssueUrl + '" target="_blank">' + IssueId + '</a>' }),
      color: 'success',
      icon: 'i-heroicons-check-circle',
      duration: 15000
    });

    handleReset();
  } catch (error) {
    console.error("Failed to save issue:", error);
    const nError = error as NuxtError;
    const errorMessage =
      (nError.data as { message: string })?.message || nError.statusMessage;
    toast.add({ title: 'Error', description: 'Error: ' + errorMessage, color: 'error', icon: 'i-heroicons-exclamation-circle' });
  }
};

const handleReset = () => {
  state.selectTracker = undefined;
  state.selectedProject = undefined;
  state.selectedAssignee = undefined;
  state.selectedVersion = undefined;
  state.trackerTitle = "";
  toast.add({ title: 'Cleared', description: 'Form cleared', color: 'neutral' });
};
</script>



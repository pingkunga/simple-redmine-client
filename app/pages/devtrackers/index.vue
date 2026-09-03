<template>
  <div class="space-y-3">
    <div id="tour-title-section" class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Dev Trackers (Program Spec / Defect)</h1>
        <p class="mt-1 text-sm text-toned">
          Create Dev Tracker in Redmine directly from here. Please make sure you have set the access key in Client Setting before using this feature.
        </p>
      </div>
      <UButton
        icon="i-heroicons-question-mark-circle"
        color="neutral"
        variant="ghost"
        label="Help Tour"
        @click="startTour"
      />
    </div>

    <div id="tour-access-key" class="rounded-lg border border-default bg-default p-3 shadow-sm">
      <DevtrackersClientAccessKey
        v-model:isUseServerToken="isUseServerToken"
        :access-key="accessKey"
        @update:isUseServerToken="projectsInit"
      />
    </div>

    <UForm :schema="schema" :state="state" class="flex flex-col gap-6" @submit="handleSubmit">
      <div id="tour-dev-info" class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <h2 class="text-base font-semibold text-highlighted">Spec Information</h2>
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

        <UFormField id="tour-tracker-title" label="Tracker Title" name="trackerTitle" required help="[SITENAME][MODULE][IMPACT] Your Desire Title (Hyphens supported in brackets)">
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

        <UFormField label="Select Version" name="selectedVersion" :required="isVersionRequired">
          <USelectMenu
            v-model="state.selectedVersion"
            :items="versions"
            label-key="name"
            placeholder="Select Version"
            class="w-full"
            virtualize
          />
        </UFormField>
      </div>  
      <div class="rounded-lg border border-default bg-default px-3 py-2 shadow-sm">
        <div class="flex items-center gap-3">
          <USwitch v-model="preservePreviousValues" />
          <div>
            <p class="text-sm font-medium text-highlighted">Keep previous values after save</p>
            <p class="text-xs text-toned">When enabled, the form keeps the last values after a successful submit.</p>
          </div>
        </div>
      </div>

      <div id="tour-submit-actions" class="flex gap-2 pt-4">
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
  </div>
  <!-- useToast is used instead of inline UToast component -->
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import { z } from 'zod';
import { computed, h } from 'vue';
import useDevTrackersTour from '~/composables/useDevTrackersTour'

const { startTour } = useDevTrackersTour()
const accessKey = ref<string | null>(null);
const isUseServerToken = ref(false);
const preservePreviousValues = ref(false);

const config = useRuntimeConfig();
const baseUrl = config.public.redmineUrl;

const { devTrackers, YourOwnRedmineAPI, TRACKER } = useRedmineAPI();
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

const isVersionRequired = computed(() => state.selectTracker !== TRACKER.CHANGE_REQUEST)

const schema = z.object({
  selectTracker: z.number('Tracker is required'),
  trackerTitle: z.string().regex(/^\[[A-Za-z0-9-]+\]\[[A-Za-z0-9-]+\]\[(IMPACT|NOIMPACT)]\s.+$/, 'Input must match the required format.'),
  selectedProject: z.object({ id: z.number() }, { error: 'Project is required' }),
  selectedAssignee: z.object({ id: z.number() }, { error: 'Project Member is required' }),
  selectedVersion: z.object({ id: z.number() }).optional()
}).superRefine((value, ctx) => {
  if (value.selectTracker !== TRACKER.CHANGE_REQUEST && !value.selectedVersion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selectedVersion'],
      message: 'Version is required'
    })
  }
})

// ===============================
// LIFECYCLE HOOKS
// ===============================
onMounted(() => {
  const { retriveAccessKey } = useClientUtil();
  accessKey.value = retriveAccessKey() || "";

  // Default mode: use client key when available, otherwise use server token.
  isUseServerToken.value = !accessKey.value;

  projectsInit();
});

const projectsInit = async () => {
  try {
    if (!isUseServerToken.value && !accessKey.value) {
      projects.value = [];
      return;
    }

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
  } catch (err : unknown) {
    console.error("Error fetching projects:", err);
    toast.add({ title: 'Error', description: 'Error fetching projects. ' + (err instanceof Error ? err.message : '') + ' Please try again.', color: 'error', icon: 'i-heroicons-exclamation-circle' });
  }
};

const projectChange = async (project: Project) => {
  console.log("Selected project:", project);

  if (project) {
    if (!isUseServerToken.value && !accessKey.value) {
      projectMembers.value = [];
      versions.value = [];
      toast.add({ title: 'Error', description: 'Please set your access key in Client Setting', color: 'error', icon: 'i-heroicons-exclamation-circle' });
      return;
    }

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
    } = await useRedmineAPI().getVersionByProjectId<Version[]>(project.id, isUseServerToken.value ? undefined : headers, 'open');
    versions.value = dataVersions.value ?? [];
  }
};

// ==============================
// FORM ACTION
// ==============================

// notifications use `useToast()`

const handleSubmit = async () => {
  try {
    if (!isUseServerToken.value && !accessKey.value) {
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

    if (!preservePreviousValues.value) {
      handleReset();
    }
  } catch (error : unknown) {
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



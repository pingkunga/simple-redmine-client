<template>
  <div class="space-y-3">
    <div id="tour-title-section" class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Build Configuration - NET Common</h1>
        <p class="mt-1 text-sm text-toned">
          Create a Build-Request issue with common version, assignee, and build options.
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

    <div id="tour-access-key" class="rounded-lg border border-default bg-default p-4 shadow-sm">
      <DevtrackersClientAccessKey
        v-model:isUseServerToken="isUseServerToken"
        :access-key="accessKey"
        @update:isUseServerToken="handleTokenModeChange"
      />
    </div>

    <UForm :schema="schema" :state="state" class="space-y-3" @submit="handleSubmit">
      <div id="tour-build-info" class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <h2 class="text-base font-semibold text-highlighted">Build Information</h2>

        <div class="mt-2 flex flex-col gap-2">
          <UFormField label="Tracker" name="selectTracker" required>
            <USelectMenu
              v-model="state.selectTracker"
              :items="trackers"
              label-key="name"
              value-key="id"
              placeholder="Select Tracker"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Tracker Title" name="trackerTitle" required>
            <UInput
              v-model="state.trackerTitle"
              placeholder="Tracker Title"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Project" name="selectedProject" required>
            <USelectMenu
              v-model="state.selectedProject"
              :items="projects"
              label-key="name"
              placeholder="Select Project"
              class="w-full"
              @update:model-value="projectChange"
            />
          </UFormField>

          <UFormField label="Select Assignee" name="selectedAssignee" required class="lg:col-span-2">
            <USelectMenu
              v-model="state.selectedAssignee"
              :items="projectMembers"
              label-key="name"
              placeholder="Select Assignee"
              class="w-full"
              :disabled="!state.selectedProject"
              virtualize
            />
          </UFormField>

           <UFormField
            label="Select Version"
            name="selectedVersion"
            required
            help="Used as both COMMON_VERSION and TAG_VERSION"
          >
            <USelectMenu
              v-model="state.selectedVersion"
              :items="versions"
              label-key="name"
              placeholder="Select Version"
              class="w-full"
              :disabled="!state.selectedProject"
              virtualize
            />
          </UFormField>
        </div>
      </div>

      <div id="tour-build-options" class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <h2 class="text-base font-semibold text-highlighted">Build Options</h2>

        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full border-collapse overflow-hidden rounded-lg border border-default">
            <thead>
              <tr class="bg-elevated">
                <th class="border-b border-default px-4 py-3 text-left text-sm font-medium text-highlighted whitespace-nowrap w-32">Execute test</th>
                <th class="border-b border-default px-4 py-3 text-left text-sm font-medium text-highlighted whitespace-nowrap w-32">SonarQube</th>
                <th class="border-b border-default px-4 py-3 text-left text-sm font-medium text-highlighted whitespace-nowrap w-32">Publish DC</th>
                <th class="border-b border-default px-4 py-3 text-left text-sm font-medium text-highlighted whitespace-nowrap w-32">Publish DR</th>
                <th class="border-b border-default px-4 py-3 text-left text-sm font-medium text-highlighted whitespace-nowrap">Build Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border-b border-default px-4 py-2 align-middle">
                  <USwitch v-model="state.executeTest" />
                </td>
                <td class="border-b border-default px-4 py-2 align-middle">
                  <USwitch v-model="state.sonarAnalysis" />
                </td>
                <td class="border-b border-default px-4 py-2 align-middle">
                  <USwitch v-model="state.publishDc" />
                </td>
                <td class="border-b border-default px-4 py-2 align-middle">
                  <USwitch v-model="state.publishDr" />
                </td>
                <td class="border-b border-default px-4 py-2 align-middle">
                  <USelect
                    v-model="state.buildPurpose"
                    :items="buildPurposeOptions"
                    class="min-w-56"
                    placeholder="Select build purpose"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="tour-submit-actions" class="flex gap-2 pt-2">
        <UButton type="submit" color="primary" block class="w-32 justify-center">
          Submit
        </UButton>
        <UButton type="button" color="neutral" variant="solid" block class="w-32 justify-center" @click="handleResetClick(true)">
          Clear
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import { h } from 'vue'
import { z } from 'zod'
import useSupportConfig from '~/composables/useSupportConfig'
import useBuildNetCommonTour from '~/composables/useBuildNetCommonTour'

const { startTour } = useBuildNetCommonTour()
const accessKey = ref<string | null>(null)
const isUseServerToken = ref(false)

const config = useRuntimeConfig()
const baseUrl = config.public.redmineUrl

const toast = useToast()
const { YourOwnRedmineAPI } = useRedmineAPI()
const {
  loadSupportTrackerOptions,
  loadSupportProjectOptions,
  loadSupportBuildPurposeOptions,
} = useSupportConfig()

const trackers = ref<{ id: number; name: string }[]>([])
const projects = ref<Project[]>([])
const projectMembers = ref<ProjectMemberShip[]>([])
const versions = ref<Version[]>([])
const buildPurposeOptions = ref<string[]>([])

const state = reactive({
  selectTracker: undefined as number | undefined,
  trackerTitle: '',
  selectedProject: undefined as Project | undefined,
  selectedAssignee: undefined as ProjectMemberShip | undefined,
  selectedVersion: undefined as Version | undefined,
  executeTest: true,
  sonarAnalysis: true,
  publishDc: true,
  publishDr: true,
  buildPurpose: ''
})

const schema = z.object({
  selectTracker: z.number('Tracker is required'),
  trackerTitle: z.string().trim().min(1, 'Tracker Title is required'),
  selectedProject: z.object({ id: z.number() }, { error: 'Project is required' }),
  selectedAssignee: z.object({ id: z.number() }, { error: 'Assignee is required' }),
  selectedVersion: z.object({ id: z.number() }, { error: 'Common version is required' }),
  buildPurpose: z.string().trim().min(1, 'Build purpose is required')
})

const createHeaders = () => ({
  [YourOwnRedmineAPI]: accessKey.value ?? "",
})

const loadConfigOptions = async () => {
  const [trackerOptions, projectOptions, buildPurposeConfig] = await Promise.all([
    loadSupportTrackerOptions('Build'),
    loadSupportProjectOptions('Library'),
    loadSupportBuildPurposeOptions(),
  ])

  trackers.value = trackerOptions
  projects.value = projectOptions
  buildPurposeOptions.value = buildPurposeConfig

  state.selectTracker = trackers.value[0]?.id
  state.selectedProject = projects.value[0]
  state.buildPurpose = buildPurposeOptions.value[0] ?? ''
}

const projectChange = async (project?: Project) => {
  state.selectedAssignee = undefined
  state.selectedVersion = undefined
  projectMembers.value = []
  versions.value = []

  if (!project) {
    return
  }

  try {
    const headers = createHeaders()
    const membershipRequest = isUseServerToken.value
      ? await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(project.id)
      : await useRedmineAPI().getProjectMemberShip<ProjectMemberShip[]>(project.id, headers)
    const versionRequest = await useRedmineAPI().getVersionByProjectId<Version[]>(project.id, headers, 'open')

    projectMembers.value = membershipRequest.data.value ?? []
    versions.value = versionRequest.data.value ?? []
  } catch (error) {
    console.error('Error fetching project data:', error)
    toast.add({ title: 'Error', description: 'Error fetching project members or versions.', color: 'error', icon: 'i-heroicons-exclamation-circle' })
  }
}

const initializePage = async () => {
  try {
    const { retriveAccessKey } = useClientUtil()
    accessKey.value = retriveAccessKey() || ''

    await loadConfigOptions()
    await projectChange(state.selectedProject)
  } catch (error) {
    console.error('Error initializing build configuration page:', error)
    toast.add({ title: 'Error', description: 'Error loading build configuration defaults.', color: 'error', icon: 'i-heroicons-exclamation-circle' })
  }
}

const handleTokenModeChange = async (value: boolean) => {
  isUseServerToken.value = value
  await projectChange(state.selectedProject)
}

const handleSubmit = async () => {
  try {
    if (!isUseServerToken.value && !accessKey.value) {
      toast.add({ title: 'Error', description: 'Please set your access key in Client Setting', color: 'error', icon: 'i-heroicons-exclamation-circle' })
      return
    }

    const buildRequest = useRedmineAPI().createBuildNetCommonRequest(
      state.selectTracker ?? 0,
      state.selectedProject ?? {} as Project,
      state.selectedAssignee ?? {} as ProjectMemberShip,
      state.selectedVersion ?? {} as Version,
      state.trackerTitle,
      {
        executeTest: state.executeTest,
        sonarAnalysis: state.sonarAnalysis,
        publishDc: state.publishDc,
        publishDr: state.publishDr,
        buildPurpose: state.buildPurpose,
      }
    )

    const issueId = isUseServerToken.value
      ? await useRedmineAPI().createBuildNetCommon(buildRequest)
      : await useRedmineAPI().createBuildNetCommon(buildRequest, createHeaders())

    if (!issueId || issueId.startsWith('Error')) {
      throw createError({ statusCode: 500, statusMessage: issueId || 'Failed to create issue' })
    }

    const fullIssueUrl = `${baseUrl}/issues/${issueId}`
    toast.add({
      title: 'Success',
      description: h('span', { innerHTML: 'Issue created with ID: <a href="' + fullIssueUrl + '" target="_blank">' + issueId + '</a>' }),
      color: 'success',
      icon: 'i-heroicons-check-circle',
      duration: 15000
    })

    await handleResetClick(false)
  } catch (error: unknown) {
    console.error('Failed to save build request:', error)
    const nuxtError = error as NuxtError
    const errorMessage = (nuxtError.data as { message?: string })?.message || nuxtError.statusMessage || 'Failed to create build request'
    toast.add({ title: 'Error', description: 'Error: ' + errorMessage, color: 'error', icon: 'i-heroicons-exclamation-circle' })
  }
}


const handleResetClick = async (showToast = true) => {
  state.selectTracker = trackers.value[0]?.id
  state.trackerTitle = ''
  state.selectedProject = projects.value[0]
  state.selectedAssignee = undefined
  state.selectedVersion = undefined
  state.executeTest = true
  state.sonarAnalysis = true
  state.publishDc = true
  state.publishDr = true
  state.buildPurpose = buildPurposeOptions.value[0] ?? ''
  await projectChange(state.selectedProject)

  if (showToast) {
    toast.add({ title: 'Cleared', description: 'Form cleared', color: 'neutral' })
  }
}

onMounted(async () => {
  await initializePage()
})
</script>
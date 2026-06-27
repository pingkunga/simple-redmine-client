<template>
  <div class="space-y-3">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Build Request — NET Primary</h1>
      <p class="mt-1 text-sm text-toned">Create a build-request issue with NET primary and optional VB6 / Gateway subtasks.</p>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
      <h2 class="text-base font-semibold text-highlighted">1. Encrypt Access Key</h2>
      <p class="mt-1 text-sm text-toned">Use the existing access key component and server-token toggle.</p>

      <div class="mt-3">
        <DevtrackersClientAccessKey
          v-model:isUseServerToken="formState.useServerToken"
          :access-key="accessKey"
          @update:isUseServerToken="handleTokenModeChange"
        />
      </div>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
      <h2 class="text-base font-semibold text-highlighted">2. Build Information</h2>

        <div class="mt-2 flex flex-col gap-2">
          <UFormField label="Layout" required>
            <USelect v-model="formState.layout" :items="layoutOptions" placeholder="Select layout" class="w-full" />
          </UFormField>
          <UFormField label="Tracker" required>
            <USelectMenu
              v-model="formState.trackerId"
              :items="trackerOptions"
              label-key="label"
              value-key="value"
              placeholder="Select tracker"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Target version" required>
            <USelectMenu
              :model-value="formState.targetVersion?.id ?? undefined"
              :items="versionOptions"
              label-key="name"
              value-key="id"
              placeholder="Select target version"
              class="w-full"
              :disabled="!formState.project?.id"
              virtualize
              @update:model-value="handleVersionChange"
            />
          </UFormField>
          <UFormField label="Build purpose" required>
            <USelect v-model="formState.buildPurpose" :items="buildPurposeOptions" placeholder="Select build purpose" class="w-full" />
          </UFormField>
          <UFormField label="Start date" required>
            <UInput v-model="formState.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="End / due date">
            <UInput v-model="formState.endDate" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Build branch" required class="md:col-span-2">
            <UInput v-model="formState.buildBranch" placeholder="release/8.9.21" class="w-full" />
          </UFormField>
        </div>
      </div>

    <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
      <h2 class="text-base font-semibold text-highlighted">3. Build option groups</h2>
      <p class="mt-1 text-sm text-toned">NET contains 3 option sets, Gateway shows 2 option sets when enabled, and VB6 is a separate optional group.</p>

      <div class="mt-4 space-y-4">
        <div class="rounded-xl border border-default bg-elevated/50 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">.NET (Primary)</h3>
              <p class="text-xs text-toned">3 build option sets for the NET request.</p>
            </div>
            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">3 sets</span>
          </div>

          <div class="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            <UFormField label="Project" required>
              <USelectMenu
                :model-value="formState.project?.id ?? undefined"
                :items="projectOptions"
                label-key="label"
                value-key="value"
                placeholder="Select project"
                class="w-full"
                @update:model-value="handleProjectChange"
              />
            </UFormField>
            <UFormField label="Select Assignee" required>
              <USelectMenu
                :model-value="formState.selectedAssignee?.id ?? undefined"
                :items="projectMembers"
                label-key="name"
                value-key="id"
                placeholder="Select assignee"
                class="w-full"
                :disabled="!formState.project?.id"
                virtualize
                @update:model-value="handleAssigneeChange"
              />
            </UFormField>
          </div>

          <div class="space-y-3">
            <div class="rounded-lg border border-default bg-default p-3">
              <h4 class="text-sm font-semibold text-highlighted">.NET WIN OPTION</h4>
              <div class="mt-3 overflow-x-auto">
                <table class="min-w-full border-collapse overflow-hidden rounded-lg border border-default text-sm">
                  <thead>
                    <tr class="bg-elevated text-left text-xs uppercase tracking-wide text-toned">
                      <th class="border-b border-default px-3 py-2">Build</th>
                      <th class="border-b border-default px-3 py-2">MODE</th>
                      <th class="border-b border-default px-3 py-2">BUILD_FRONT</th>
                      <th class="border-b border-default px-3 py-2">OFFICE ADDINS</th>
                      <th class="border-b border-default px-3 py-2">AUTOUPDATE</th>
                      <th class="border-b border-default px-3 py-2">GEN_SBOM</th>
                      <th class="border-b border-default px-3 py-2">KEEP_PACKAGE</th>
                      <th class="border-b border-default px-3 py-2">ZIP_KEEP_PACKAGE</th>
                      <th class="border-b border-default px-3 py-2">SEND_NOTIFY</th>
                      <th class="border-b border-default px-3 py-2">CLEANUP WS</th>
                      <th class="border-b border-default px-3 py-2">SUBMODULE CHECK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.buildInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USelect v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.mode" :items="['Release', 'Debug']" class="min-w-28" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.buildFront" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.officeAddins" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.autoUpdate" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.genSbom" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.keepPackage" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.zipKeepPackage" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.sendNotify" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.cleanupWs" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreWindows.submoduleCheck" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="rounded-lg border border-default bg-default p-3">
              <h4 class="text-sm font-semibold text-highlighted">.NET CONTAINER OPTION (TSY)</h4>
              <div class="mt-3 overflow-x-auto">
                <table class="min-w-full border-collapse overflow-hidden rounded-lg border border-default text-sm">
                  <thead>
                    <tr class="bg-elevated text-left text-xs uppercase tracking-wide text-toned">
                      <th class="border-b border-default px-3 py-2">Build</th>
                      <th class="border-b border-default px-3 py-2">TARGET_OS</th>
                      <th class="border-b border-default px-3 py-2">BUILD_BACK</th>
                      <th class="border-b border-default px-3 py-2">BUILD_FRONT</th>
                      <th class="border-b border-default px-3 py-2">DEPLOY_SCM</th>
                      <th class="border-b border-default px-3 py-2">DEPLOY_NEXUS</th>
                      <th class="border-b border-default px-3 py-2 min-w-32">DOCKER_FILE</th>
                      <th class="border-b border-default px-3 py-2">CLEAN_UP</th>
                      <th class="border-b border-default px-3 py-2">SUBMODULECHECK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.containerBuildTsy" /></td>
                      <td class="border-b border-default px-3 py-2"><USelect v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.targetOsTsy" :items="['linux', 'win', 'osx']" class="min-w-28" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.containerBuildBackTsy" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.containerBuildFrontTsy" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.deployScmTsy" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.deployNexusTsy" /></td>
                      <td class="border-b border-default px-3 py-2">
                        <USelectMenu
                          v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.dockerFileTsy"
                          :items="dockerFileOptions.buildInvSetDOTNETCustomContainerTSY"
                          label-key="label"
                          value-key="value"
                          placeholder="Select Dockerfile"
                          class="min-w-50"
                        />
                      </td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.cleanupTsy" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.submoduleCheckTsy" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="rounded-lg border border-default bg-default p-3">
              <h4 class="text-sm font-semibold text-highlighted">.NET CONTAINER OPTION (INV, BTS, ICS)</h4>
              <div class="mt-3 overflow-x-auto">
                <table class="min-w-full border-collapse overflow-hidden rounded-lg border border-default text-sm">
                  <thead>
                    <tr class="bg-elevated text-left text-xs uppercase tracking-wide text-toned">
                      <th class="border-b border-default px-3 py-2">Build</th>
                      <th class="border-b border-default px-3 py-2">TARGET_OS</th>
                      <th class="border-b border-default px-3 py-2">BUILD_BACK</th>
                      <th class="border-b border-default px-3 py-2">BUILD_FRONT</th>
                      <th class="border-b border-default px-3 py-2">DEPLOY_SCM</th>
                      <th class="border-b border-default px-3 py-2">DEPLOY_NEXUS</th>
                      <th class="border-b border-default px-3 py-2 min-w-32">DOCKER_FILE</th>
                      <th class="border-b border-default px-3 py-2">CLEAN_UP</th>
                      <th class="border-b border-default px-3 py-2">SUBMODULECHECK</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.containerBuildInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USelect v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.targetOsInv" :items="['linux', 'win', 'osx']" class="min-w-28" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.containerBuildBackInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.containerBuildFrontInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.deployScmInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.deployNexusInv" /></td>
                      <td class="border-b border-default px-3 py-2">
                        <USelectMenu
                          v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.dockerFileInv"
                          :items="dockerFileOptions.buildInvSetDOTNETCoreContainer"
                          label-key="label"
                          value-key="value"
                          placeholder="Select Dockerfile"
                          class="min-w-50"
                        />
                      </td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.cleanupInv" /></td>
                      <td class="border-b border-default px-3 py-2"><USwitch v-model="formState.buildDOTNET.buildInvSetDOTNETCoreContainer.submoduleCheckInv" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-default bg-elevated/50 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">Gateway (Optional)</h3>
              <p class="text-xs text-toned">Show 2 gateway option sets when this group is enabled.</p>
            </div>
            <USwitch v-model="formState.buildSpringBoot.enabled" />
          </div>

          <div v-if="formState.buildSpringBoot.enabled" class="space-y-3">
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <UFormField label="Project" required>
                <USelectMenu
                  :model-value="formState.buildSpringBoot.project?.id ?? undefined"
                  :items="gatewayProjectOptions"
                  label-key="label"
                  value-key="value"
                  placeholder="Select project"
                  class="w-full"
                  @update:model-value="handleGatewayProjectChange"
                />
              </UFormField>
              <UFormField label="Select Assignee" required>
                <USelectMenu
                  :model-value="formState.buildSpringBoot.selectedAssignee?.id ?? undefined"
                  :items="gatewayMembers"
                  label-key="name"
                  value-key="id"
                  placeholder="Select assignee"
                  class="w-full"
                  :disabled="!formState.buildSpringBoot.project?.id"
                  virtualize
                  @update:model-value="handleGatewayAssigneeChange"
                />
              </UFormField>
            </div>

            <div class="rounded-lg border border-default bg-default p-3">
              <h4 class="text-sm font-semibold text-highlighted">BNZ Gateway Option</h4>
              <div class="mt-3 overflow-x-auto">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr class="bg-elevated text-left text-xs uppercase tracking-wide text-toned">
                      <th class="border-b border-default px-3 py-2 text-left align-middle">Build</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">BUILD_FRONT</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">UNIT_TEST</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">EXECUTE_SONAR</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">BUILD_CONTAINER</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">DEPLOY_NEXUS</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">DEPLOY_SCM</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">CLEAN_UP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.build" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.buildFront" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.unitTest" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.sonar" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.buildContainer" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.deployNexus" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.deployScm" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCore.cleanup" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="rounded-lg border border-default bg-default p-3">
              <h4 class="text-sm font-semibold text-highlighted">BNZ Gateway (TSY) Option</h4>
              <div class="mt-3 overflow-x-auto">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr class="bg-elevated text-left text-xs uppercase tracking-wide text-toned">
                      <th class="border-b border-default px-3 py-2 text-left align-middle">Build</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">BUILD_FRONT</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">UNIT_TEST</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">EXECUTE_SONAR</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">BUILD_CONTAINER</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">DEPLOY_NEXUS</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">DEPLOY_SCM</th>
                      <th class="border-b border-default px-3 py-2 text-left align-middle">CLEAN_UP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCustomTSY.build" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCustomTSY.unitTest" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"></td>
                      <td class="border-b border-default px-3 py-2 align-middle"></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCustomTSY.deployNexus" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCustomTSY.deployScm" /></td>
                      <td class="border-b border-default px-3 py-2 align-middle"><USwitch v-model="formState.buildSpringBoot.buildInvSetGatewayCustomTSY.cleanup" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-default bg-elevated/50 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">VB6 (Optional)</h3>
              <p class="text-xs text-toned">Separate VB6 build options.</p>
            </div>
            <USwitch v-model="formState.buildVB6.enabled" />
          </div>

          <div v-if="formState.buildVB6.enabled" class="space-y-3">
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <UFormField label="Project" required>
                <USelectMenu
                  :model-value="formState.buildVB6.project?.id ?? undefined"
                  :items="vb6ProjectOptions"
                  label-key="label"
                  value-key="value"
                  placeholder="Select project"
                  class="w-full"
                  @update:model-value="handleVB6ProjectChange"
                />
              </UFormField>
              <UFormField label="Select Assignee" required>
                <USelectMenu
                  :model-value="formState.buildVB6.selectedAssignee?.id ?? undefined"
                  :items="vb6Members"
                  label-key="name"
                  value-key="id"
                  placeholder="Select assignee"
                  class="w-full"
                  :disabled="!formState.buildVB6.project?.id"
                  virtualize
                  @update:model-value="handleVB6AssigneeChange"
                />
              </UFormField>
            </div>

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label class="rounded-lg border border-default bg-default p-3 text-sm">Build <USwitch v-model="formState.buildVB6.build" class="mt-2" /></label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-2 pt-2">
      <UButton color="primary" class="w-32 justify-center" :loading="isSubmitting" @click="handleSubmit">Submit</UButton>
      <UButton color="neutral" variant="solid" class="w-32 justify-center">Clear</UButton>
    </div>
    <p v-if="submitMessage" class="text-sm text-toned">{{ submitMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import type { BuildInvSetRequest } from '~~/shared/types/BuildInvSet'
import type { Project, ProjectMemberShip } from '~~/shared/types/Project'
import type { Version } from '~~/shared/types/Version'
import useSupportConfig from '~/composables/useSupportConfig'
import useBuildInvSetAPI from '~/composables/useBuildInvSetAPI'

const {
  loadSupportTrackerOptions,
  loadSupportProjectOptions,
  loadSupportBuildPurposeOptions,
  loadSupportCustomLookupOptions,
  loadSupportLayoutOptions,
} = useSupportConfig()
const { submitBuildInvSet } = useBuildInvSetAPI()

const accessKey = ref<string | null>(null)
const trackerOptions = ref<Array<{ label: string; value: number }>>([])
const projectOptions = ref<Array<{ label: string; value: number }>>([])
const gatewayProjectOptions = ref<Array<{ label: string; value: number }>>([])
const vb6ProjectOptions = ref<Array<{ label: string; value: number }>>([])
const versionOptions = ref<Version[]>([])
const projectMembers = ref<ProjectMemberShip[]>([])
const gatewayMembers = ref<ProjectMemberShip[]>([])
const vb6Members = ref<ProjectMemberShip[]>([])
const selectedVersion = ref<Version | null>(null)
const buildPurposeOptions = ref<Array<{ label: string; value: string }>>([])
const layoutOptions = ref<Array<{ label: string; value: string }>>([])
const dockerFileOptions = reactive<Record<string, Array<{ label: string; value: string }>>>({
  buildInvSetDOTNETCustomContainerTSY: [],
  buildInvSetDOTNETCoreContainer: [],
})
const isSubmitting = ref(false)
const submitMessage = ref('')

const formState = reactive<BuildInvSetRequest>({
  trackerId: 0,
  project: {} as any,
  targetVersion: {} as any,
  buildPurpose: '',
  layout: '',
  selectedAssignee: undefined,
  startDate: '2026-06-18',
  endDate: '2026-06-22',
  buildBranch: 'release/8.9.21',
  useServerToken: false,
  buildDOTNET: {
    enabled: true,
    buildInvSetDOTNETCoreWindows: {
      buildInv: true,
      mode: 'Release',
      buildFront: true,
      officeAddins: true,
      autoUpdate: false,
      genSbom: false,
      keepPackage: true,
      zipKeepPackage: true,
      sendNotify: true,
      cleanupWs: true,
      submoduleCheck: true,
    },
    buildInvSetDOTNETCoreContainer: {
      containerBuildInv: true,
      containerBuildBackInv: true,
      containerBuildFrontInv: true,
      targetOsInv: 'linux',
      deployScmInv: true,
      deployNexusInv: true,
      cleanupInv: true,
      submoduleCheckInv: true,
      dockerFileInv: '',
    },
    buildInvSetDOTNETCustomContainerTSY: {
      containerBuildTsy: true,
      containerBuildBackTsy: true,
      containerBuildFrontTsy: false,
      targetOsTsy: 'linux',
      deployScmTsy: true,
      deployNexusTsy: false,
      cleanupTsy: true,
      submoduleCheckTsy: true,
      dockerFileTsy: '',
    },
  },
  buildSpringBoot: {
    enabled: false,
    project: {} as any,
    selectedAssignee: undefined,
    buildInvSetGatewayCore: {
      build: true,
      buildFront: false,
      buildContainer: true,
      deployScm: true,
      deployNexus: true,
      unitTest: true,
      sonar: true,
      cleanup: true,
    },
    buildInvSetGatewayCustomTSY: {
      build: true,
      buildFront: false,
      buildContainer: true,
      deployScm: true,
      deployNexus: true,
      unitTest: true,
      sonar: true,
      cleanup: true,
    },
  },
  buildVB6: {
    enabled: false,
    project: {} as any,
    selectedAssignee: undefined,
    build: true,
  },
})

const loadCustomLookupOptions = async () => {
  try {
    const [customContainerOptions, coreContainerOptions] = await Promise.all([
      loadSupportCustomLookupOptions('buildInvSetDOTNETCoreContainer', 'buildInvSetDOTNETCustomContainerTSY'),
      loadSupportCustomLookupOptions('buildInvSetDOTNETCoreContainer', 'buildInvSetDOTNETCoreContainer'),
    ])

    dockerFileOptions.buildInvSetDOTNETCustomContainerTSY = customContainerOptions
    dockerFileOptions.buildInvSetDOTNETCoreContainer = coreContainerOptions

    if (!formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.dockerFileTsy && dockerFileOptions.buildInvSetDOTNETCustomContainerTSY.length) {
      formState.buildDOTNET.buildInvSetDOTNETCustomContainerTSY.dockerFileTsy = dockerFileOptions.buildInvSetDOTNETCustomContainerTSY[0]?.value ?? ''
    }

    if (!formState.buildDOTNET.buildInvSetDOTNETCoreContainer.dockerFileInv && dockerFileOptions.buildInvSetDOTNETCoreContainer.length) {
      formState.buildDOTNET.buildInvSetDOTNETCoreContainer.dockerFileInv = dockerFileOptions.buildInvSetDOTNETCoreContainer[0]?.value ?? ''
    }
  } catch (error) {
    console.error('Failed to load custom lookup options:', error)
  }
}

const loadBuildPurposeOptions = async () => {
  try {
    const buildPurposeConfig = await loadSupportBuildPurposeOptions('BuildInvSet')

    buildPurposeOptions.value = buildPurposeConfig.map((name) => ({ label: name, value: name }))

    if (!formState.buildPurpose && buildPurposeOptions.value.length) {
      formState.buildPurpose = buildPurposeOptions.value[0]?.value ?? ''
    }
  } catch (error) {
    console.error('Failed to load build purpose options:', error)
  }
}

const loadTrackerOptions = async () => {
  try {
    const trackerConfig = await loadSupportTrackerOptions('Build')

    trackerOptions.value = trackerConfig.map((item) => ({ label: item.name, value: item.id }))

    if (!formState.trackerId && trackerOptions.value.length) {
      formState.trackerId = trackerOptions.value[0]?.value ?? 0
    }
  } catch (error) {
    console.error('Failed to load tracker options:', error)
  }
}

const loadLayoutOptions = async () => {
  try {
    const layoutConfig = await loadSupportLayoutOptions()

    layoutOptions.value = layoutConfig

    if (!formState.layout && layoutOptions.value.length) {
      formState.layout = layoutOptions.value[0]?.value ?? ''
    }
  } catch (error) {
    console.error('Failed to load layout options:', error)
  }
}

const loadProjectOptions = async () => {
  try {
    const [netConfig, vbConfig, gatewayConfig] = await Promise.all([
      loadSupportProjectOptions('INVS-Product'),
      loadSupportProjectOptions('INVS-Product-VB'),
      loadSupportProjectOptions('INVS-Product-Gateway'),
    ])

    projectOptions.value = netConfig.map((item) => ({ label: item.name, value: item.id }))
    vb6ProjectOptions.value = vbConfig.map((item) => ({ label: item.name, value: item.id }))
    gatewayProjectOptions.value = gatewayConfig.map((item) => ({ label: item.name, value: item.id }))

    if (!formState.project?.id && netConfig[0]) {
      formState.project = netConfig[0]
      await handleProjectChange(formState.project.id)
    }

    if (!formState.buildVB6.project?.id && vbConfig[0]) {
      formState.buildVB6.project = vbConfig[0]
      await handleVB6ProjectChange(formState.buildVB6.project.id)
    }

    if (!formState.buildSpringBoot.project?.id && gatewayConfig[0]) {
      formState.buildSpringBoot.project = gatewayConfig[0]
      await handleGatewayProjectChange(formState.buildSpringBoot.project.id)
    }
  } catch (error) {
    console.error('Failed to load project options:', error)
  }
}

const syncTargetVersionSelection = (version: Version | null | undefined) => {
  selectedVersion.value = version ?? null
  formState.targetVersion = version ?? {} as Version
}

const handleVersionChange = (versionId?: number | null) => {
  const selected = versionOptions.value.find((version) => version.id === versionId) ?? null
  syncTargetVersionSelection(selected)
}

const handleAssigneeChange = (assigneeId?: number | null) => {
  formState.selectedAssignee = projectMembers.value.find((member) => member.id === assigneeId) ?? undefined
}

const handleGatewayAssigneeChange = (assigneeId?: number | null) => {
  formState.buildSpringBoot.selectedAssignee = gatewayMembers.value.find((member) => member.id === assigneeId) ?? undefined
}

const handleVB6AssigneeChange = (assigneeId?: number | null) => {
  formState.buildVB6.selectedAssignee = vb6Members.value.find((member) => member.id === assigneeId) ?? undefined
}

const handleProjectChange = async (projectId?: number) => {
  const selectedProject = projectOptions.value.find((item) => item.value === projectId)
  formState.project = { id: projectId ?? 0, name: selectedProject?.label ?? '' }
  formState.selectedAssignee = undefined
  versionOptions.value = []
  projectMembers.value = []
  syncTargetVersionSelection(null)

  if (!projectId) {
    return
  }

  await Promise.all([
    loadVersionOptions(projectId),
    loadProjectMembers(projectId),
  ])
}

const handleGatewayProjectChange = async (projectId?: number) => {
  const selectedProject = gatewayProjectOptions.value.find((item) => item.value === projectId)
  formState.buildSpringBoot.project = { id: projectId ?? 0, name: selectedProject?.label ?? '' }
  formState.buildSpringBoot.selectedAssignee = undefined
  gatewayMembers.value = []

  if (projectId) {
    await loadGatewayProjectMembers(projectId)
  }
}

const handleVB6ProjectChange = async (projectId?: number) => {
  const selectedProject = vb6ProjectOptions.value.find((item) => item.value === projectId)
  formState.buildVB6.project = { id: projectId ?? 0, name: selectedProject?.label ?? '' }
  formState.buildVB6.selectedAssignee = undefined
  vb6Members.value = []

  if (projectId) {
    await loadVB6ProjectMembers(projectId)
  }
}

const loadVersionOptions = async (projectId?: number) => {
  versionOptions.value = []
  syncTargetVersionSelection(null)

  if (!projectId) {
    return
  }

  try {
    const redmineApi = useRedmineAPI()
    const headers = !formState.useServerToken && accessKey.value
      ? { [redmineApi.YourOwnRedmineAPI]: accessKey.value }
      : undefined

    const versionRequest = formState.useServerToken
      ? await redmineApi.getVersionByProjectId<Version[]>(projectId)
      : await redmineApi.getVersionByProjectId<Version[]>(projectId, headers)

    const versions = (versionRequest.data.value ?? []) as Version[]
    versionOptions.value = versions.filter((version): version is Version => typeof version.id === 'number' && typeof version.name === 'string')

    if (!formState.targetVersion?.id && versionOptions.value.length) {
      syncTargetVersionSelection(versionOptions.value[0] ?? null)
    }
  } catch (error) {
    console.error('Failed to load version options:', error)
  }
}

const loadProjectMembers = async (projectId?: number) => {
  projectMembers.value = []
  if (projectId) {
    projectMembers.value = await fetchMembers(projectId)
  }
}

const loadGatewayProjectMembers = async (projectId: number) => {
  gatewayMembers.value = await fetchMembers(projectId)
}

const loadVB6ProjectMembers = async (projectId: number) => {
  vb6Members.value = await fetchMembers(projectId)
}

const fetchMembers = async (projectId: number) => {
  try {
    const redmineApi = useRedmineAPI()
    const headers = !formState.useServerToken && accessKey.value
      ? { [redmineApi.YourOwnRedmineAPI]: accessKey.value }
      : undefined

    const membershipRequest = formState.useServerToken
      ? await redmineApi.getProjectMemberShip<ProjectMemberShip[]>(projectId)
      : await redmineApi.getProjectMemberShip<ProjectMemberShip[]>(projectId, headers)

    return (membershipRequest.data.value ?? []) as ProjectMemberShip[]
  } catch (error) {
    console.error('Failed to load project members:', error)
    return []
  }
}

const initializePage = async () => {
  const { retriveAccessKey } = useClientUtil()
  accessKey.value = retriveAccessKey() || ''
  await loadCustomLookupOptions()
  await loadBuildPurposeOptions()
  await loadTrackerOptions()
  await loadLayoutOptions()
  await loadProjectOptions()
}

const handleTokenModeChange = async (value: boolean) => {
  formState.useServerToken = value

  const promises = []
  if (formState.project?.id) {
    promises.push(loadVersionOptions(formState.project.id), loadProjectMembers(formState.project.id))
  }
  if (formState.buildSpringBoot.project?.id) {
    promises.push(loadGatewayProjectMembers(formState.buildSpringBoot.project.id))
  }
  if (formState.buildVB6.project?.id) {
    promises.push(loadVB6ProjectMembers(formState.buildVB6.project.id))
  }

  if (promises.length) {
    await Promise.all(promises)
  }
}

const handleSubmit = async () => {
  isSubmitting.value = true
  submitMessage.value = ''

  try {
    const result = await submitBuildInvSet(formState as BuildInvSetRequest)
    console.log('BuildInvSet payload', formState)
    console.log('BuildInvSet submitted:', result)
    submitMessage.value = 'Build request submitted successfully.'
  } catch (error: any) {
    console.error('Failed to submit BuildInvSet:', error)
    submitMessage.value = error?.statusMessage || 'Failed to submit BuildInvSet.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await initializePage()
})
</script>

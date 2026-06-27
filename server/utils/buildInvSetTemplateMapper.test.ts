import { describe, expect, it } from 'vitest'
import type { BuildInvSetRequest } from '~/shared/types/BuildInvSet'
import { buildBuildInvSetPayloads, buildToggleMarker } from './buildInvSetTemplateMapper'

const buildRequest = (): BuildInvSetRequest => ({
  tracker: 99,
  project: { id: 1, name: 'Test Project' },
  targetVersion: { id: 10, name: '8.9.21', projectid: 1, projectname: 'Test Project', versionName: '8.9.21', description: '', status: 'open', due_date: null, sharing: 'none', wiki_page_title: '', created_on: '', updated_on: '' },
  buildPurpose: 'SCM Official Build',
  layout: 'Default',
  selectedAssignee: { projectId: 1, memberType: 'user', id: 99, name: 'Tester', membershipid: 'user99' },
  startDate: '2026-06-26',
  endDate: '2026-06-30',
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
      deployNexusInv: false,
      cleanupInv: true,
      submoduleCheckInv: true,
      dockerFileInv: 'Dockerfile',
    },
    buildInvSetDOTNETCustomContainerTSY: {
      containerBuildTsy: true,
      containerBuildBackTsy: true,
      containerBuildFrontTsy: false,
      targetOsTsy: 'win',
      deployScmTsy: true,
      deployNexusTsy: false,
      cleanupTsy: true,
      submoduleCheckTsy: true,
      dockerFileTsy: 'Dockerfile.tsy',
    },
  },
  buildSpringBoot: {
    enabled: true,
    project: { id: 2, name: 'Gateway Project' },
    selectedAssignee: { projectId: 2, memberType: 'user', id: 88, name: 'Gateway Owner', membershipid: 'user88' },
    buildInvSetGatewayCore: {
      build: true,
      buildFront: false,
      buildContainer: true,
      deployScm: true,
      deployNexus: true,
      unitTest: true,
      sonar: false,
      cleanup: true,
    },
    buildInvSetGatewayCustomTSY: {
      build: true,
      buildFront: false,
      buildContainer: true,
      deployScm: true,
      deployNexus: false,
      unitTest: true,
      sonar: false,
      cleanup: true,
    },
  },
  buildVB6: {
    enabled: true,
    project: { id: 3, name: 'VB6 Project' },
    selectedAssignee: { projectId: 3, memberType: 'user', id: 77, name: 'VB6 Owner', membershipid: 'user77' },
    build: true,
  },
})

describe('buildInvSetTemplateMapper', () => {
  it('converts boolean flags to marker strings', () => {
    expect(buildToggleMarker(true)).toBe('/')
    expect(buildToggleMarker(false)).toBe('')
  })

  it('returns payloads in dotnet, vb6, spring order', async () => {
    const payloads = await buildBuildInvSetPayloads(buildRequest())

    expect(payloads.map((payload) => payload.type)).toEqual(['dotnet', 'vb6', 'spring'])
  })

  it('renders net payloads with expected replacements', async () => {
    const payloads = await buildBuildInvSetPayloads(buildRequest())
    const netPayload = payloads.find((payload) => payload.type === 'dotnet')?.payload as any

    expect(netPayload).toBeDefined()
    expect(netPayload.issue.subject).toContain('8.9.21')
    expect(netPayload.issue.project_id).toBe(1)
    expect(netPayload.issue.tracker_id).toBe(99)
  })

  it('renders spring payloads with expected replacements', async () => {
    const payloads = await buildBuildInvSetPayloads(buildRequest())
    const springPayload = payloads.find((payload) => payload.type === 'spring')?.payload as any

    expect(springPayload).toBeDefined()
    expect(springPayload.issue.project_id).toBe(2)
    expect(springPayload.issue.tracker_id).toBe(99)
  })

  it('renders vb6 payloads with expected replacements', async () => {
    const payloads = await buildBuildInvSetPayloads(buildRequest())
    const vb6Payload = payloads.find((payload) => payload.type === 'vb6')?.payload as any

    expect(vb6Payload).toBeDefined()
    expect(vb6Payload.issue.project_id).toBe(3)
    expect(vb6Payload.issue.tracker_id).toBe(99)
  })
})

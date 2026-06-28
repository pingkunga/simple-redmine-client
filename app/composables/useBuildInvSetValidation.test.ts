import { describe, expect, it } from 'vitest'
import { validateBuildInvSetForm } from './useBuildInvSetValidation'

describe('validateBuildInvSetForm', () => {
  it('reports missing required build information fields', () => {
    const formState = {
      layout: '',
      trackerId: 0,
      buildPurpose: '',
      startDate: '',
      endDate: '',
      buildBranch: '',
      project: { id: 1 },
      selectedAssignee: { id: 2 },
      targetVersion: undefined,
      buildDOTNET: { enabled: true },
      buildSpringBoot: { enabled: false },
      buildVB6: { enabled: false },
    } as any

    const result = validateBuildInvSetForm(formState, '')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      'Layout is required',
      'Tracker is required',
      'Target version is required',
      'Build purpose is required',
      'Start date is required',
      'Build branch is required',
    ]))
  })

  it('requires project and assignee for enabled gateway and vb6 groups', () => {
    const formState = {
      layout: 'Default',
      trackerId: 10,
      buildPurpose: 'Release',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      buildBranch: 'release/1.0',
      project: { id: 1 },
      selectedAssignee: { id: 2 },
      targetVersion: { id: 3 },
      buildDOTNET: { enabled: true },
      buildSpringBoot: { enabled: true, project: {}, selectedAssignee: undefined },
      buildVB6: { enabled: true, project: {}, selectedAssignee: undefined },
    } as any

    const result = validateBuildInvSetForm(formState, 'access-key')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      'Gateway: Please select a Project',
      'Gateway: Please select an Assignee',
      'VB6: Please select a Project',
      'VB6: Please select an Assignee',
    ]))
  })

  it('allows a valid form state', () => {
    const formState = {
      layout: 'Default',
      trackerId: 10,
      buildPurpose: 'Release',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      buildBranch: 'release/1.0',
      project: { id: 1 },
      selectedAssignee: { id: 2 },
      targetVersion: { id: 3 },
      buildDOTNET: { enabled: true },
      buildSpringBoot: { enabled: false },
      buildVB6: { enabled: false },
    } as any

    const result = validateBuildInvSetForm(formState, 'access-key')

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

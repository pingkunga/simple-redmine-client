import { afterEach, describe, expect, it, vi } from 'vitest'
import useSupportConfig from './useSupportConfig'

describe('useSupportConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads trackers, projects, and build purposes with separate filterable methods', async () => {
    const fetchSpy = vi.fn()

    fetchSpy
      .mockResolvedValueOnce([
        { id: 1, name: 'Build Tracker', purpose: 'Build' },
        { id: 2, name: 'Other Tracker', purpose: 'Other' },
      ])
      .mockResolvedValueOnce([
        { id: 10, name: 'Library Project', purpose: 'Library' },
        { id: 11, name: 'Other Project', purpose: 'Other' },
      ])
      .mockResolvedValueOnce([{ name: 'Release', purpose: 'BuildInvSet' }])

    vi.stubGlobal('$fetch', fetchSpy)

    const {
      loadSupportTrackerOptions,
      loadSupportProjectOptions,
      loadSupportBuildPurposeOptions,
    } = useSupportConfig()

    await expect(loadSupportTrackerOptions('Build')).resolves.toEqual([
      { id: 1, name: 'Build Tracker' },
    ])

    await expect(loadSupportProjectOptions('Library')).resolves.toEqual([
      { id: 10, name: 'Library Project' },
    ])

    await expect(loadSupportBuildPurposeOptions('BuildInvSet')).resolves.toEqual(['Release'])
  })

  it('loads custom lookup values for a specific category and purpose', async () => {
    const fetchSpy = vi.fn().mockResolvedValue([
      { name: 'Dockerfile A', category: 'buildInvSetDOTNETCoreContainer', purpose: 'buildInvSetDOTNETCoreContainer' },
      { name: 'Dockerfile B', category: 'buildInvSetDOTNETCoreContainer', purpose: 'buildInvSetDOTNETCustomContainerTSY' },
    ])

    vi.stubGlobal('$fetch', fetchSpy)

    const { loadSupportCustomLookupOptions } = useSupportConfig()

    await expect(
      loadSupportCustomLookupOptions('buildInvSetDOTNETCoreContainer', 'buildInvSetDOTNETCoreContainer'),
    ).resolves.toEqual([
      { label: 'Dockerfile A', value: 'Dockerfile A' },
    ])
  })

})

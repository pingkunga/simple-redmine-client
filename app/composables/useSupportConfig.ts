const logConfigPayload = (fileName: string, payload: unknown) => {
  console.log(`[useSupportConfig] ${fileName}:`, payload)
}

export default function useSupportConfig() {
  const loadSupportTrackerOptions = async (purpose = 'Build') => {
    const trackerOptions = await $fetch<SupportTrackerOption[]>('/api/config/SupportTracker.json')
    logConfigPayload('SupportTracker.json', trackerOptions)

    if (!Array.isArray(trackerOptions)) return []

    return trackerOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportProjectOptions = async (purpose = 'Library') => {
    const projectOptions = await $fetch<SupportProjectOption[]>('/api/config/SupportProject.json')
    logConfigPayload('SupportProject.json', projectOptions)

    if (!Array.isArray(projectOptions)) return []

    return projectOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportBuildPurposeOptions = async (purpose?: string) => {
    const buildPurposeConfig = await $fetch<SupportBuildPurposeOption[]>('/api/config/SupportBuildPurpose.json')
    logConfigPayload('SupportBuildPurpose.json', buildPurposeConfig)

    if (!Array.isArray(buildPurposeConfig)) return []

    return buildPurposeConfig
      .filter((item) => !purpose || item.purpose === purpose)
      .map((item) => item.name)
  }

  const loadSupportCustomLookupOptions = async (category: string, purpose: string) => {
    const lookupConfig = await $fetch<SupportCustomLookupOption[]>('/api/config/SupportCustomLookup.json')
    logConfigPayload('SupportCustomLookup.json', lookupConfig)

    if (!Array.isArray(lookupConfig)) return []

    return lookupConfig
      .filter((item) => item.category === category && item.purpose === purpose)
      .map((item) => ({ label: item.name, value: item.name }))
  }

  const loadSupportLayoutOptions = async () => {
    const layoutConfig = await $fetch<Array<{ id: number; name: string; description?: string; order?: number }>>('/api/config/buildinvset.json')
    logConfigPayload('buildinvset.json', layoutConfig)

    if (!Array.isArray(layoutConfig)) return []

    return [...layoutConfig]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item) => ({ label: item.name, value: item.name }))
  }

  return {
    loadSupportTrackerOptions,
    loadSupportProjectOptions,
    loadSupportBuildPurposeOptions,
    loadSupportCustomLookupOptions,
    loadSupportLayoutOptions,
  }
}

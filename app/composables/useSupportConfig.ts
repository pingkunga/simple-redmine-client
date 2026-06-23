const logConfigPayload = (fileName: string, payload: unknown) => {
  console.log(`[useSupportConfig] ${fileName}:`, payload)
}

export default function useSupportConfig() {
  const loadSupportTrackerOptions = async (purpose = 'Build') => {
    const trackerOptions = await $fetch<SupportTrackerOption[]>('/Config/SupportTracker.json')
    logConfigPayload('SupportTracker.json', trackerOptions)

    return trackerOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportProjectOptions = async (purpose = 'Library') => {
    const projectOptions = await $fetch<SupportProjectOption[]>('/Config/SupportProject.json')
    logConfigPayload('SupportProject.json', projectOptions)

    return projectOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportBuildPurposeOptions = async (purpose?: string) => {
    const buildPurposeConfig = await $fetch<SupportBuildPurposeOption[]>('/Config/SupportBuildPurpose.json')
    logConfigPayload('SupportBuildPurpose.json', buildPurposeConfig)

    return buildPurposeConfig
      .filter((item) => !purpose || item.purpose === purpose)
      .map((item) => item.name)
  }

  const loadSupportCustomLookupOptions = async (category: string, purpose: string) => {
    const lookupConfig = await $fetch<SupportCustomLookupOption[]>('/Config/SupportCustomLookup.json')
    logConfigPayload('SupportCustomLookup.json', lookupConfig)

    return lookupConfig
      .filter((item) => item.category === category && item.purpose === purpose)
      .map((item) => ({ label: item.name, value: item.name }))
  }

  return {
    loadSupportTrackerOptions,
    loadSupportProjectOptions,
    loadSupportBuildPurposeOptions,
    loadSupportCustomLookupOptions,
  }
}

const normalizeConfigItems = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { value?: unknown }).value)) {
    return (payload as { value: T[] }).value
  }

  return []
}

export default function useSupportConfig() {
  const loadSupportTrackerOptions = async (purpose = 'Build') => {
    const trackerOptions = await $fetch<SupportTrackerOption[] | { value?: SupportTrackerOption[] }>('/Config/SupportTracker.json')
    const items = normalizeConfigItems<SupportTrackerOption>(trackerOptions)

    return items
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportProjectOptions = async (purpose = 'Library') => {
    const projectOptions = await $fetch<SupportProjectOption[] | { value?: SupportProjectOption[] }>('/Config/SupportProject.json')
    const items = normalizeConfigItems<SupportProjectOption>(projectOptions)

    return items
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportBuildPurposeOptions = async (purpose?: string) => {
    const buildPurposeConfig = await $fetch<SupportBuildPurposeOption[] | { value?: SupportBuildPurposeOption[] }>('/Config/SupportBuildPurpose.json')
    const items = normalizeConfigItems<SupportBuildPurposeOption>(buildPurposeConfig)

    return items
      .filter((item) => !purpose || item.purpose === purpose)
      .map((item) => item.name)
  }

  const loadSupportCustomLookupOptions = async (category: string, purpose: string) => {
    const lookupConfig = await $fetch<SupportCustomLookupOption[] | { value?: SupportCustomLookupOption[] }>('/Config/SupportCustomLookup.json')
    const items = normalizeConfigItems<SupportCustomLookupOption>(lookupConfig)

    return items
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

export default function useSupportConfig() {
  const loadSupportTrackerOptions = async (purpose = 'Build') => {
    const trackerOptions = await $fetch<SupportTrackerOption[]>('/Config/SupportTracker.json')

    return trackerOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportProjectOptions = async (purpose = 'Library') => {
    const projectOptions = await $fetch<SupportProjectOption[]>('/Config/SupportProject.json')

    return projectOptions
      .filter((item) => item.purpose === purpose)
      .map((item) => ({ id: item.id, name: item.name }))
  }

  const loadSupportBuildPurposeOptions = async () => {
    const buildPurposeConfig = await $fetch<SupportBuildPurposeOption[]>('/Config/SupportBuildPurpose.json')

    return buildPurposeConfig.map((item) => item.name)
  }

  return {
    loadSupportTrackerOptions,
    loadSupportProjectOptions,
    loadSupportBuildPurposeOptions,
  }
}

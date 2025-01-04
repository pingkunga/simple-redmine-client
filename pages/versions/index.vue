<template>
  <div>Versions</div>
  <v-text-field
    v-model="searchText"
    label="Search"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    hide-details
    single-line
  ></v-text-field>
  <!-- Chips for filtering -->
  <v-chip-group selected-class="text-primary" multiple>
    <v-chip
      v-for="versionStatus in versionStatuses"
      :key="String(versionStatus)"
      @click="toggleVersionStatus(versionStatus)"
    >
      {{ versionStatus }}
    </v-chip>
  </v-chip-group>
  <!-- <pre> {{ selectVersionStatus }}</pre> -->
  <v-data-table :items="versions" :search="searchText"></v-data-table>
</template>

<script setup lang="ts">
const selectVersionStatus = ref<string[]>([]);

const { versionStatuses } = useRedmineAPI();

const { data: dataversions, error } = await useRedmineAPI().getVersions<Version[]>();

const versions = computed(() => {
  if (selectVersionStatus.value.length === 0) {
    return dataversions.value ?? [];
  }
  return (
    dataversions.value?.filter((version) =>
      selectVersionStatus.value.includes(version.status)
    ) ?? []
  );
});

const toggleVersionStatus = (versionStatus: string) => {
  const index = selectVersionStatus.value.indexOf(versionStatus);
  if (index === -1) {
    selectVersionStatus.value.push(versionStatus);
  } else {
    selectVersionStatus.value.splice(index, 1);
  }
};

const searchText = ref("");
</script>

<style scoped></style>

<template>
  <ClientOnly>
    <div>
      <v-text-field
        label="Access Key"
        prepend-icon="mdi-eye"
        v-model="accessKey"
        required
      ></v-text-field>
      <v-btn color="primary" @click="handleSaveAccessKey">Save</v-btn>
      <v-btn color="red-darken-1" @click="handleRemoveAccessKey">Remove Key</v-btn>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const accessKey = ref<string>();

const handleSaveAccessKey = async () => {
  const { storeAccessKey } = useClientUtil();
  storeAccessKey(accessKey.value!);
};

const handleRemoveAccessKey = async () => {
  const { removeAccessKey } = useClientUtil();
  removeAccessKey();
  accessKey.value = "";
};
</script>

<style scoped></style>

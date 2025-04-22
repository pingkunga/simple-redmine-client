<template>
  <ClientOnly>
    <div>
      <v-text-field
        label="Access Key"
        prepend-icon="mdi-eye"
        v-model="accessKey"
        type="Password"
        required
      ></v-text-field>
      <div class="button-container">
        <v-btn color="primary" class="button" @click="handleSaveAccessKey">Save</v-btn>
        <v-btn color="red-darken-1" class="button" @click="handleRemoveAccessKey"
          >Remove Key</v-btn
        >
      </div>
    </div>
    <Snackbar
      v-model:isVisible="snackbar"
      :message="snackbarMessage"
      :color="snackbarColor"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import Snackbar from "~/components/Snackbar.vue";

const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("");

const accessKey = ref<string>();

//get access key from local storage
const { retriveAccessKey } = useClientUtil();
accessKey.value = retriveAccessKey() ?? undefined;

const handleSaveAccessKey = async () => {
  if (!accessKey.value) {
    snackbarMessage.value = "Please enter a valid access key.";
    snackbarColor.value = "error";
    snackbar.value = true;
    return;
  }
  const { storeAccessKey } = useClientUtil();
  storeAccessKey(accessKey.value!);

  snackbarMessage.value = "Access key saved successfully.";
  snackbarColor.value = "success";
  snackbar.value = true;
};

const handleRemoveAccessKey = async () => {
  const { removeAccessKey } = useClientUtil();
  removeAccessKey();
  accessKey.value = "";

  snackbarMessage.value = "Access key removed successfully.";
  snackbarColor.value = "success";
  snackbar.value = true;
};
</script>

<style scoped>
.button-container {
  display: flex;
  gap: 5px; /* Add spacing between buttons */
}

.button {
  max-width: 200px; /* Set a maximum width for the buttons */
  flex: 1; /* Make buttons take equal space */
  text-align: center; /* Center the text inside the button */
}
</style>

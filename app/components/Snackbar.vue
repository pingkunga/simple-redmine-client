<!-- filepath: d:\2WarRoom\2024RedmineClient\redmine-client\components\Snackbar.vue -->
<template>
  <v-snackbar v-model="localVisible" :timeout="timeout" :color="color" top right>
    {{ message }}
    <v-btn color="white" @click="closeSnackbar">Close</v-btn>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Props for the Snackbar component
const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: "info", // Default color
  },
  timeout: {
    type: Number,
    default: 7000, // Default timeout
  },
});

// Emit event to update visibility
const emit = defineEmits(["update:isVisible"]);

// Computed property to handle v-model binding
const localVisible = computed({
  get: () => props.isVisible,
  set: (value: boolean) => emit("update:isVisible", value),
});

// Method to close the snackbar
const closeSnackbar = () => {
  localVisible.value = false;
};
</script>

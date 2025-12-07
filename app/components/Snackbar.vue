<!-- filepath: d:\2WarRoom\2024RedmineClient\redmine-client\components\Snackbar.vue -->
<template>
  <UAlert v-if="localVisible" :color="color" variant="outline" class="fixed top-4 right-4 z-50">
    {{ message }}
    <template #actions>
      <UButton color="gray" variant="ghost" @click="closeSnackbar">Close</UButton>
    </template>
  </UAlert>
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

// Auto close after timeout
if (props.timeout > 0) {
  setTimeout(() => {
    closeSnackbar();
  }, props.timeout);
}
</script>

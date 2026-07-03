<template>
  <ClientOnly>
    <!--check if found access key in local storage-->
    <div v-if="!accessKey" class="text-red-500 mb-4">
      Please set your access key in Client Setting
    </div>
    <div v-else class="mb-2 space-y-2 pt-2">
      <UFormField label="Encrypt Access Key">
        <UInput
          :model-value="accessKey"
          readonly
          type="password"
          icon="i-heroicons-lock-closed"
        />
      </UFormField>
      <div class="flex items-center gap-6">
        <USwitch
          :model-value="isUseServerToken"
          @update:model-value="$emit('update:isUseServerToken', $event)"
        />
        <span class="text-sm text-gray-700 dark:text-gray-200">Use Server Token</span>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
defineProps<{
  accessKey: string | null;
  isUseServerToken: boolean;
}>();

defineEmits<{
  (e: 'update:isUseServerToken', value: boolean): void;
}>();
</script>

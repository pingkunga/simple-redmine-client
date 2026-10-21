<template>
  <UPopover :content="{ side: 'top', align: 'start' }">
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-heroicons-cog-6-tooth"
      :label="statusLabel"
      aria-label="Chat settings"
    />

    <template #content>
      <div class="w-80 space-y-2 p-3">
        <h3 class="text-sm font-semibold text-highlighted">Redmine access</h3>
        <DevtrackersClientAccessKey
          :access-key="accessKey"
          :is-use-server-token="isUseServerToken"
          @update:isUseServerToken="isUseServerToken = $event"
        />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const props = defineProps<{
  accessKey: string | null;
}>();

const isUseServerToken = defineModel<boolean>('isUseServerToken', { required: true });

// ClientOnly inside the key control hides itself on the server, so keep this label stable too.
const statusLabel = computed(() => (isUseServerToken.value || !props.accessKey ? 'Server token' : 'Own key'));
</script>

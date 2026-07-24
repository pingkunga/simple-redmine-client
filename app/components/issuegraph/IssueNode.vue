<template>
  <div class="issue-node w-55 rounded-lg border bg-default px-3 py-2 shadow-sm text-xs" :class="issue.isRoot ? 'border-primary border-2' : 'border-default'">
    <Handle type="target" :position="Position.Top" />

    <div class="flex items-center justify-between gap-2">
      <a :href="issueUrl" target="_blank" class="font-semibold text-primary hover:underline" @click.stop>
        #{{ issue.id }}
      </a>
      <UBadge size="xs" variant="subtle" color="neutral">{{ issue.trackerName }}</UBadge>
    </div>

    <div class="mt-1 line-clamp-3 wrap-break-word" :title="issue.subject">{{ issue.subject }}</div>

    <div class="mt-1 flex items-center justify-between gap-2">
      <UBadge size="xs" variant="subtle">{{ issue.statusName }}</UBadge>
      <UButton
        v-if="issue.hasMoreRelations"
        size="xs"
        variant="ghost"
        icon="i-mdi-plus-circle-outline"
        title="Expand related issues"
        @click.stop="emit('expand', issue.id)"
      />
    </div>

    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

const props = defineProps<{ issue: IssueGraphNode }>();
const emit = defineEmits<{ expand: [id: number] }>();

const config = useRuntimeConfig();
const issueUrl = computed(() => `${config.public.redmineUrl}/issues/${props.issue.id}`);
</script>

<template>
  <div class="w-full h-[70vh] border border-default rounded-lg">
    <VueFlow :nodes="nodes" :edges="edges" fit-view-on-init :min-zoom="0.2">
      <Background />
      <Controls />
      <template #node-issue="{ data }">
        <IssuegraphIssueNode :issue="data.issue" @expand="(id: number) => emit('expand-node', id)" />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow } from "@vue-flow/core";
import type { Node, Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

defineProps<{ nodes: Node[]; edges: Edge[] }>();
const emit = defineEmits<{ "expand-node": [id: number] }>();
</script>

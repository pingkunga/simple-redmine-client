<template>
  <div>
    <h1>Issue Relation Graph</h1>

    <div class="px-4 py-3.5 border-b border-accented space-y-3">
      <form class="flex items-end gap-4 flex-wrap" @submit.prevent="handleSearch">
        <UFormField label="Issue ID" required>
          <UInput v-model="issueId" type="number" placeholder="e.g. 334586" class="w-40" />
        </UFormField>
        <UButton type="submit" :loading="loading" :disabled="!issueId">Show Graph</UButton>
        <UButton variant="outline" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options
        </UButton>
      </form>

      <UCollapsible v-model:open="showAdvanced">
        <template #content>
          <div class="flex items-end gap-4 flex-wrap pt-2">
            <UFormField label="Depth" description="Hops to traverse from the root issue">
              <UInput v-model="depth" type="number" :min="1" :max="5" class="w-32" />
            </UFormField>
            <UFormField label="Max Nodes" description="Safety cap on total issues fetched">
              <UInput v-model="maxNodes" type="number" :min="1" :max="200" class="w-32" />
            </UFormField>
            <UFormField label="Timeout (sec)" description="Safety cap on traversal time">
              <UInput v-model="timeoutSec" type="number" :min="1" :max="30" class="w-32" />
            </UFormField>
          </div>
        </template>
      </UCollapsible>

      <UAlert
        v-if="truncatedMessage"
        color="warning"
        variant="subtle"
        icon="i-mdi-alert-outline"
        :description="truncatedMessage"
      />
    </div>

    <div class="pt-4">
      <IssuegraphIssueGraphCanvas
        v-if="elements.nodes.length"
        :nodes="elements.nodes"
        :edges="elements.edges"
        @expand-node="handleExpand"
      />
      <div v-else-if="!loading" class="text-muted text-sm px-4 py-8">
        Enter an issue ID and click "Show Graph" to visualize its relations.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Node, Edge } from "@vue-flow/core";

const toast = useToast();
const { getIssueGraph, expandNode, mergeGraphResponse } = useIssueGraph();
const { layout } = useDagreLayout();

const issueId = ref<string>("");
const depth = ref(2);
const maxNodes = ref(50);
const timeoutSec = ref(5);
const showAdvanced = ref(false);
const loading = ref(false);
const truncatedMessage = ref("");

const elements = ref<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });

const applyLayout = () => {
  elements.value = { nodes: layout(elements.value.nodes, elements.value.edges), edges: elements.value.edges };
};

const setTruncatedMessage = (truncated: boolean, reason?: string) => {
  if (!truncated || reason === 'depth') {
    truncatedMessage.value = "";
    return;
  }
  truncatedMessage.value = reason === 'maxNodes'
    ? `Graph truncated: reached the max node limit (${maxNodes.value}). Expand individual nodes to see more.`
    : `Graph truncated: traversal timed out (${timeoutSec.value}s). Expand individual nodes to see more.`;
};

const handleSearch = async () => {
  const id = Number(issueId.value);
  if (!id) return;

  loading.value = true;
  truncatedMessage.value = "";
  try {
    const { data, error } = await getIssueGraph(id, {
      depth: depth.value,
      maxNodes: maxNodes.value,
      timeoutMs: timeoutSec.value * 1000,
    });

    if (error.value) {
      toast.add({ title: "Failed to load issue graph", description: error.value.statusMessage, color: "error" });
      elements.value = { nodes: [], edges: [] };
      return;
    }

    const response = data.value;
    if (!response) return;

    elements.value = mergeGraphResponse({ nodes: [], edges: [] }, response);
    applyLayout();
    setTruncatedMessage(response.truncated, response.truncatedReason);
  } catch (err: any) {
    toast.add({ title: "Failed to load issue graph", description: err?.message, color: "error" });
  } finally {
    loading.value = false;
  }
};

const handleExpand = async (id: number) => {
  try {
    const response = await expandNode(id);
    elements.value = mergeGraphResponse(elements.value, response);
    applyLayout();
    setTruncatedMessage(response.truncated, response.truncatedReason);
  } catch (err: any) {
    toast.add({ title: `Failed to expand issue ${id}`, description: err?.message, color: "error" });
  }
};
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
    <header class="mb-4">
      <h1 class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">AI Chat</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        ถามข้อมูล Redmine / GitLab แบบอ่านอย่างเดียว (version, issue, branch, release สัปดาห์นี้)
      </p>
    </header>

    <div v-if="!chat.messages.length" class="mb-4 flex flex-wrap gap-2">
      <UButton
        v-for="q in examples"
        :key="q"
        size="sm"
        color="neutral"
        variant="outline"
        :label="q"
        @click="ask(q)"
      />
    </div>

    <UChatMessages
      :messages="chat.messages"
      :status="chat.status"
      class="flex-1 overflow-y-auto"
    >
      <template #content="{ message }">
        <template v-for="(part, i) in message.parts" :key="`${message.id}-${i}`">
          <template v-if="part.type === 'text'">
            <!-- Assistant text is untrusted: sanitized by renderMarkdown. User text stays plain. -->
            <div v-if="message.role === 'assistant'" class="chat-md" v-html="renderMarkdown(part.text)" />
            <p v-else class="whitespace-pre-wrap">{{ part.text }}</p>
          </template>
        </template>
      </template>
    </UChatMessages>

    <UAlert
      v-if="errorText"
      class="mb-3"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="errorText"
    />

    <UChatPrompt v-model="input" :maxrows="6" placeholder="พิมพ์คำถามที่นี่..." @submit="submit">
      <UChatPromptSubmit :status="chat.status" @stop="chat.stop()" @reload="chat.regenerate()" />
    </UChatPrompt>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport } from 'ai';
import { renderMarkdown } from '~/utils/renderMarkdown';

const examples = [
  'version ไหน Buildวันศุกร์นี้ ใครดูแล',
  'สรุป issue ทั้งหมดใน version 8.9.15.4 ให้หน่อย',
  'branch ล่าสุดของ GitLab ใครสร้าง',
];

const input = ref('');

const chat = new Chat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});

const submit = () => {
  const text = input.value.trim();
  if (!text || chat.status === 'submitted' || chat.status === 'streaming') return;
  chat.sendMessage({ text });
  input.value = '';
};

const ask = (text: string) => {
  input.value = text;
  submit();
};

// The route replies with JSON { error } for 4xx/5xx; the SDK puts that body in error.message.
const errorText = computed(() => {
  const err = chat.error;
  if (!err) return '';
  let msg = err.message;
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error) msg = String(parsed.error);
  } catch {
    /* not JSON: keep the raw message */
  }
  return msg || 'Something went wrong. Please try again.';
});
</script>

<style scoped>
.chat-md :deep(p) { margin: 0.4rem 0; }
.chat-md :deep(ul) { list-style: disc; padding-left: 1.25rem; margin: 0.4rem 0; }
.chat-md :deep(ol) { list-style: decimal; padding-left: 1.25rem; margin: 0.4rem 0; }
.chat-md :deep(a) { text-decoration: underline; color: var(--ui-primary); }
.chat-md :deep(pre) { overflow-x: auto; padding: 0.5rem; border-radius: 0.375rem; background: var(--ui-bg-muted); }
.chat-md :deep(code) { font-family: ui-monospace, monospace; font-size: 0.875em; }
.chat-md :deep(table) { border-collapse: collapse; margin: 0.5rem 0; }
.chat-md :deep(th), .chat-md :deep(td) { border: 1px solid var(--ui-border); padding: 0.25rem 0.5rem; }
</style>

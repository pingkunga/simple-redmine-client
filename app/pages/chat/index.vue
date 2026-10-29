<template>
  <div class="p-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
    <header class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">AI Chat</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ถามข้อมูล Redmine / GitLab แบบอ่านอย่างเดียว (version, issue, branch, release สัปดาห์นี้)
        </p>
      </div>
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-heroicons-arrow-down-tray"
        label="Download"
        :disabled="!canDownload"
        @click="downloadChat"
      />
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
            <div v-if="message.role === 'assistant'" class="chat-md" v-html="renderMarkdown(part.text, { issueUrlBase: redmineUrl })" />
            <p v-else class="whitespace-pre-wrap">{{ part.text }}</p>
          </template>
        </template>
      </template>
      <!-- The default indicator is 3 tiny, near-invisible dots; show a spinner with a label instead. -->
      <template #indicator>
        <div class="flex items-center gap-2 py-2 text-sm text-gray-700 dark:text-gray-200">
          <UIcon name="i-mdi-loading" class="size-5 animate-spin text-primary" />
          <span>Thinking...</span>
        </div>
      </template>
    </UChatMessages>

    <!-- 'submitted' is covered by the indicator slot; this covers the tool-calling phase before any text arrives. -->
    <div
      v-if="busyLabel"
      class="mb-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
      role="status"
    >
      <UIcon name="i-mdi-loading" class="size-5 animate-spin text-primary" />
      <span>{{ busyLabel }}</span>
    </div>

    <UAlert
      v-if="errorText"
      class="mb-3"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="errorText"
    />

    <!-- The model can finish after its tool calls without writing any text; otherwise the page just stays blank. -->
    <UAlert
      v-else-if="emptyReply"
      class="mb-3"
      color="warning"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="No response from the model"
      :actions="[{ label: 'ลองใหม่', color: 'neutral', variant: 'outline', onClick: () => chat.regenerate() }]"
    />

    <UChatPrompt v-model="input" :maxrows="6" placeholder="พิมพ์คำถามที่นี่..." @submit="submit">
      <template #footer>
        <div class="flex w-full items-center justify-between">
          <ChatSettings v-model:is-use-server-token="isUseServerToken" :access-key="accessKey" />
          <UChatPromptSubmit :status="chat.status" @stop="chat.stop()" @reload="chat.regenerate()" />
        </div>
      </template>
    </UChatPrompt>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport } from 'ai';
import { renderMarkdown } from '~/utils/renderMarkdown';
import { chatFileName, chatToMarkdown } from '~/utils/chatExport';

const examples = [
  'version ไหน Buildวันศุกร์นี้ ใครดูแล',
  'สรุป issue ทั้งหมดใน version 8.9.15.4 ให้หน่อย',
  'branch feature/yieldcurve ล่าสุดของ GitLab ใครสร้าง',
  'สรุป issue ทั้งหมดในของ version 8.9.9.1 - 8.9.20.5 ให้หน่อย แบ่งตาม version ที่ละ 10 version',
];

const input = ref('');
const redmineUrl = useRuntimeConfig().public.redmineUrl as string;

// Same choice as the DevTracker page: own key from Client Setting, else the server token.
const { YourOwnRedmineAPI } = useRedmineAPI();
const accessKey = ref<string | null>(null);
const isUseServerToken = ref(true);

onMounted(() => {
  accessKey.value = useClientUtil().retriveAccessKey() || '';
  isUseServerToken.value = !accessKey.value;
});

const chat = new Chat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    // Evaluated per request, so flipping the switch needs no chat reset.
    headers: (): Record<string, string> =>
      !isUseServerToken.value && accessKey.value ? { [YourOwnRedmineAPI]: accessKey.value } : {},
  }),
  // Keep the real cause for debugging; the page only shows a friendly message.
  onError: (err) => console.error('[chat] request failed', err),
});

const submit = () => {
  const text = input.value.trim();
  if (!text || chat.status === 'submitted' || chat.status === 'streaming') return;
  chat.sendMessage({ text });
  input.value = '';
};

// Disabled while streaming so the file never holds a half-written answer.
const canDownload = computed(() =>
  chat.messages.length > 0 && chat.status !== 'submitted' && chat.status !== 'streaming');

const downloadChat = () => {
  const now = new Date();
  const blob = new Blob([chatToMarkdown(chat.messages, now)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = chatFileName(now);
  a.click();
  URL.revokeObjectURL(url);
};

const ask = (text: string) => {
  input.value = text;
  submit();
};

// While streaming but before any answer text arrives, say what the assistant is doing.
const busyLabel = computed(() => {
  if (chat.status !== 'streaming') return '';
  const last = chat.messages[chat.messages.length - 1];
  if (!last || last.role !== 'assistant') return '';
  if (last.parts.some(p => p.type === 'text' && p.text.trim())) return '';

  const running = last.parts.find(
    (p): p is typeof p & { state: string } =>
      (p.type.startsWith('tool-') || p.type === 'dynamic-tool') && 'state' in p && p.state !== 'output-available',
  );
  if (!running) return 'Writing the answer...';
  const name = running.type === 'dynamic-tool' ? (running as { toolName?: string }).toolName : running.type.slice(5);
  return name ? `Looking up data (${name})...` : 'Looking up data...';
});

// Done streaming, but the last assistant message has no visible text.
const emptyReply = computed(() => {
  if (chat.status !== 'ready' || chat.error) return false;
  const last = chat.messages[chat.messages.length - 1];
  if (!last || last.role !== 'assistant') return false;
  return !last.parts.some(p => p.type === 'text' && p.text.trim());
});

const GENERIC_ERROR = 'Something went wrong. Please try again.';

// The route replies with JSON { error } for 4xx/5xx; the SDK puts that body in error.message.
const errorText = computed(() => {
  const err = chat.error;
  if (!err) return '';
  let msg = err.message;
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error) msg = String(parsed.error);
    // A bare JSON value such as `true` or `null` is not a message a person can act on.
    else if (typeof parsed !== 'object' || parsed === null) msg = '';
  } catch {
    /* not JSON: keep the raw message */
  }
  return msg.trim() || GENERIC_ERROR;
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

<template>
  <div class="flex flex-col gap-4 max-w-7xl mx-auto w-full">
    <!-- Header style consistent with versions/issues -->
    <div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
      <h1 class="text-2xl font-bold">Release Mail Designer</h1>
      <div class="flex items-center gap-2">
        <UInput v-model="testRecipient" placeholder="Test Recipient" class="w-48" />
        <UButton color="neutral" variant="soft" :loading="sending" icon="i-mdi-send" @click="handleSendTest">Test</UButton>
        <UButton color="primary" :loading="saving" icon="i-mdi-content-save" @click="handleSave">Save</UButton>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-6">
      <UTabs :items="tabItems" class="w-full">
        <template #visual>
          <div class="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg overflow-hidden">
            <UEditor 
              v-slot="{ editor }"
              v-model="templateData.body" 
              content-type="html" 
              :starter-kit="{
                heading: { levels: [1, 2, 3, 4] },
                bold: {},
                italic: {},
                strike: {},
                code: {},
                blockquote: {},
                bulletList: {},
                orderedList: {},
                link: { openOnClick: false }
              }"
              :extensions="[
                Highlight.configure({ multicolor: true, HTMLAttributes: { class: 'highlight' } }),
              ]"
              placeholder="Design your email content here..." 
              class="min-h-[400px] p-4"
            >
              <UEditorToolbar 
                :editor="editor" 
                :items="toolbarItems" 
                size="sm" 
                class="border-b border-gray-200 dark:border-gray-800 p-1.5 bg-gray-50 dark:bg-gray-800" 
              />
            </UEditor>
          </div>
        </template>
        
        <template #style>
          <div class="mt-4">
            <UFormField label="Global CSS Styles" description="CSS for tables, fonts, and highlights">
              <UTextarea v-model="templateData.style" :rows="16" class="font-mono text-xs" />
            </UFormField>
          </div>
        </template>

        <template #preview>
          <div class="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg overflow-hidden">
            <div class="px-3 py-2 border-b text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-800 flex justify-between">
              <span>Preview Mode: HTML Wrapper</span>
              <div class="flex items-center gap-2">
                <span>Active Version:</span>
                <span class="text-primary-600 dark:text-primary-400 font-bold">{{ currentPreviewVersion?.name }}</span>
              </div>
            </div>
            <div class="p-6 overflow-y-auto min-h-[500px]">
              <div v-html="finalPreviewHtml" class="mail-preview-container text-sm"></div>
            </div>
          </div>
        </template>
      </UTabs>

      <!-- Variables Section -->
      <div class="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500">Available Variables</h3>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">Preview Data Selection:</span>
            <USelect v-model="selectedVersionId" :items="versionOptions" size="sm" class="w-48" />
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="p in placeholders" 
            :key="p"
            variant="subtle"
            size="sm"
            class="font-mono"
            @click="insertPlaceholder(p)"
          >
            <span v-text="'{{' + p + '}}'"></span>
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Highlight } from '@tiptap/extension-highlight'
import type { un } from 'vue-router/dist/router-CWoNjPRp.mjs';
import type { VersionWithReleaseNotes } from '~~/shared/types/Version';

const toast = useToast();
const saving = ref(false);
const sending = ref(false);
const testRecipient = ref('');
const templateData = ref({ body: '', style: '' });
const versions = ref<VersionWithReleaseNotes[]>([]);
const selectedVersionId = ref<number>();

const tabItems = [
  { slot: 'visual', label: 'Visual Editor', icon: 'i-mdi-format-color-text' },
  { slot: 'style', label: 'Styles (CSS)', icon: 'i-mdi-language-css3' },
  { slot: 'preview', label: 'Live Preview', icon: 'i-mdi-eye' }
];

const placeholders = [
  'versionText', 'wikiFullURL', 'ownerTeam', 'nextWeekReleaseVersion', 
  'versionDueDateText', 'version', 'currentReleaseBranch', 'buildFor'
];

const toolbarItems = [
  [{
    kind: 'heading',
    level: 1,
    icon: 'i-mdi-format-header-1',
    label: 'Heading 1'
  }, {
    kind: 'heading',
    level: 2,
    icon: 'i-mdi-format-header-2',
    label: 'Heading 2'
  }, {
    kind: 'heading',
    level: 3,
    icon: 'i-mdi-format-header-3',
    label: 'Heading 3'
  }],
  [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-mdi-format-bold',
    label: 'Bold'
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-mdi-format-italic',
    label: 'Italic'
  }, {
    kind: 'mark',
    mark: 'strike',
    icon: 'i-mdi-format-strikethrough',
    label: 'Strikethrough'
  },{
    kind: 'mark',
    mark: 'highlight', // เพิ่มปุ่ม Highlight
    icon: 'i-mdi-format-color-highlight',
    label: 'Highlight'
  },{
    kind: 'link', // เพิ่มปุ่ม Link
    icon: 'i-mdi-link',
    label: 'Hyperlink'
  }],
  [{
    kind: 'bulletList',
    icon: 'i-mdi-format-list-bulleted',
    label: 'Bullet List'
  }, {
    kind: 'orderedList',
    icon: 'i-mdi-format-list-numbered',
    label: 'Numbered List'
  }],
  [{
    kind: 'blockquote',
    icon: 'i-mdi-format-quote-close',
    label: 'Quote'
  }, {
    kind: 'code',
    icon: 'i-mdi-code-tags',
    label: 'Code'
  }],
  // [{
  //   kind: 'command',
  //   icon: 'i-mdi-table-plus',
  //   label: 'Insert Table',
  //   click: ({ editor }: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  // }, {
  //   kind: 'command',
  //   icon: 'i-mdi-table-row-plus-after',
  //   label: 'Add Row After',
  //   click: ({ editor }: any) => editor.chain().focus().addRowAfter().run()
  // }, {
  //   kind: 'command',
  //   icon: 'i-mdi-table-column-plus-after',
  //   label: 'Add Col After',
  //   click: ({ editor }: any) => editor.chain().focus().addColumnAfter().run()
  // }, {
  //   kind: 'command',
  //   icon: 'i-mdi-table-remove',
  //   label: 'Delete Table',
  //   click: ({ editor }: any) => editor.chain().focus().deleteTable().run()
  // }]
];

// Fetch Data
const fetchData = async () => {
  try {
    const data = await $fetch<any>('/api/release/template');
    if (data) {
        templateData.value = data;
    }

    const versionsList = await $fetch<VersionWithReleaseNotes[]>('/api/release/thisweek-release', {
        query: { projectId: 858 } // Using sample project ID from redmine_api.http
    });
    if (versionsList) {
        versions.value = versionsList;
        if (versions.value.length > 0) selectedVersionId.value = versions.value[0]?.id;
    }
  } catch (error) {
    console.error('Failed to fetch template or versions:', error);
  }
};

onMounted(fetchData);

const versionOptions = computed(() => versions.value.map(v => ({ label: v.name, value: v.id })));
const currentPreviewVersion = computed(() => versions.value.find(v => v.id === selectedVersionId.value));

// Merge logic for Preview
const finalPreviewHtml = computed(() => {
    let html = templateData.value.body;
    const style = templateData.value.style;
    const v = currentPreviewVersion.value;
    
    if (v) {
        placeholders.forEach(key => {
            // Support both {{key}} and $($currentVersion.key)
            html = html.split(`{{${key}}}`).join((v as any)[key] || '');
            html = html.split(`$($currentVersion.${key})`).join((v as any)[key] || '');
        });
    }

    return `<html><head><style>${style}</style></head><body><div class="mail-content">${html}</div></body></html>`;
});

const insertPlaceholder = (p: string) => {
    templateData.value.body += ` {{${p}}}`;
    toast.add({ title: 'Added', description: `Variable {{${p}}} added to template`, color: 'info', duration: 1000 });
};

const handleSave = async () => {
    saving.value = true;
    try {
        await $fetch('/api/release/template', {
            method: 'POST',
            body: templateData.value
        });
        toast.add({ title: 'Template Saved', color: 'success', icon: 'i-mdi-check-circle' });
    } catch (e) {
        toast.add({ title: 'Error Saving', color: 'error', icon: 'i-mdi-alert' });
    } finally {
        saving.value = false;
    }
};

const handleSendTest = async () => {
    if (!testRecipient.value) {
        toast.add({ title: 'Recipient Required', description: 'Please enter a test email address', color: 'warning' });
        return;
    }
    
    sending.value = true;
    try {
        await $fetch('/api/release/send-release-mail', {
            method: 'POST',
            body: {
                recipients: [testRecipient.value], // ส่งเป็น Array
                projectId: 858, // หรือ ID ของ Project ที่เกี่ยวข้อง
                template: templateData.value 
            }
        });
        toast.add({ title: 'Test Mail Sent', description: `Sent to ${testRecipient.value}`, color: 'success', icon: 'i-mdi-email-check' });
    } catch (e : unknown) {
        const error = e as Error;
        //toast.add({ title: 'Error', description: 'Failed to save version. ' + (error instanceof Error ? error.message : '') + ' Please try again.', color: 'error', icon: 'i-heroicons-exclamation-circle' });
        toast.add({ title: 'Send Failed', description: 'Failed to send test email. ' + (error instanceof Error ? error.message : '') + ' Please try again.', color: 'error', icon: 'i-mdi-alert' });
    } finally {
        sending.value = false;
    }
};
</script>

<style scoped>
.mail-preview-container :deep(table) {
    width: 100% !important;
    border-collapse: collapse;
}
.mail-preview-container :deep(td), .mail-preview-container :deep(th) {
    border: 1px solid #dddddd;
    text-align: left;
    padding: 8px;
}
.mail-preview-container :deep(ul) {
    list-style-type: disc !important;
    padding-left: 2em !important;
    margin: 1em 0;
}
.mail-preview-container :deep(.highlight) {
    background-color: #FFFF00;
}

/* Editor table styles */
/* :deep(.tiptap table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
  overflow: hidden;
}
:deep(.tiptap td), :deep(.tiptap th) {
  min-width: 1em;
  border: 1px solid #ddd;
  padding: 3px 5px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}
:deep(.tiptap th) {
  font-weight: bold;
  text-align: left;
  background-color: #f1f3f5;
}
:deep(.dark .tiptap th) {
    background-color: #1a202c;
} */
</style>
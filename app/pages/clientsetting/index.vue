<template>
  <ClientOnly>
    <UCard class="w-full mt-8">
      <template #header>
        <h2 class="text-xl font-bold">Client Settings</h2>
      </template>
      
      <div class="space-y-6">
        <UFormGroup label="Access Key" required>
          <UInput
            v-model="accessKey"
            type="password"
            icon="i-heroicons-key"
            class="w-full"
            :ui="{ base: 'min-w-[40ch]' }"
            placeholder="Enter your Redmine Access Key"
          />
        </UFormGroup>

        <div class="flex gap-4 pt-4">
          <UButton 
            color="primary" 
            @click="handleSaveAccessKey"
            icon="i-heroicons-check"
            class="w-32 justify-center"
          >
            Save
          </UButton>
          <UButton 
            color="error" 
            variant="soft"
            @click="handleRemoveAccessKey"
            icon="i-heroicons-trash"
            class="w-32 justify-center"
          >
            Remove Key
          </UButton>
        </div>
        <div class="pt-6">
          <img src="/images/HowToGetRedmineAccessKey.webp" alt="Access Key Guide" class="w-full rounded-md border" />
        </div>
      </div>
    </UCard>
  </ClientOnly>
</template>

<script setup lang="ts">
const toast = useToast();
const accessKey = ref<string>();

//get access key from local storage
const { retriveAccessKey, storeAccessKey, removeAccessKey } = useClientUtil();
accessKey.value = retriveAccessKey() ?? undefined;

const handleSaveAccessKey = async () => {
  if (!accessKey.value) {
    toast.add({
      title: 'Error',
      description: 'Please enter a valid access key.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    });
    return;
  }
  
  storeAccessKey(accessKey.value!);

  toast.add({
    title: 'Success',
    description: 'Access key saved successfully.',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  });
};

const handleRemoveAccessKey = async () => {
  removeAccessKey();
  accessKey.value = "";

  toast.add({
    title: 'Success',
    description: 'Access key removed successfully.',
    color: 'success',
    icon: 'i-heroicons-check-circle'
  });
};
</script>

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

        <div class="flex gap-4">
          <UButton 
            color="primary" 
            @click="handleSaveAccessKey"
            icon="i-heroicons-check"
          >
            Save
          </UButton>
          <UButton 
            color="red" 
            variant="soft"
            @click="handleRemoveAccessKey"
            icon="i-heroicons-trash"
          >
            Remove Key
          </UButton>
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
      color: 'red',
      icon: 'i-heroicons-exclamation-circle'
    });
    return;
  }
  
  storeAccessKey(accessKey.value!);

  toast.add({
    title: 'Success',
    description: 'Access key saved successfully.',
    color: 'green',
    icon: 'i-heroicons-check-circle'
  });
};

const handleRemoveAccessKey = async () => {
  removeAccessKey();
  accessKey.value = "";

  toast.add({
    title: 'Success',
    description: 'Access key removed successfully.',
    color: 'green',
    icon: 'i-heroicons-check-circle'
  });
};
</script>

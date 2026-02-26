<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <UCard class="w-full max-w-md shadow-xl">
      <template #header>
        <div class="flex flex-col items-center space-y-2 py-2">
          <UIcon name="i-heroicons-lock-closed" class="w-10 h-10 text-primary" />
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Login</h1>
          <p class="text-sm text-gray-500">Sign in to manage release notes</p>
        </div>
      </template>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <UFormField label="Username" name="username">
          <UInput 
            v-model="username" 
            placeholder="Username" 
            icon="i-heroicons-user" 
            autocomplete="username"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput 
            v-model="password" 
            type="password" 
            placeholder="••••••••" 
            icon="i-heroicons-key" 
            autocomplete="current-password"
            class="w-full"
            required
          />
        </UFormField>
        
        <UFormField name="Login" size="lg">
          <UButton 
            type="submit" 
            block 
            size="lg" 
            color="primary" 
            :loading="loading"
            class="font-semibold"
          >
            Sign In
          </UButton>
        </UFormField>
      </form>

      <template v-if="error" #footer>
        <UAlert 
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="soft"
          title="Login Failed"
          :description="error"
        />
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false // ไม่ใช้ layout ปกติเพื่อความคลีน
});

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { 
        username: username.value, 
        password: password.value 
      }
    });
    
    // สำเร็จแล้วไปที่หน้า admin
    navigateTo('/admin/release-mail');
  } catch (err: any) {
    error.value = err.data?.statusMessage || 'Invalid credentials';
  } finally {
    loading.value = false;
  }
};
</script>

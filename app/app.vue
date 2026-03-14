<script setup lang="ts">
//const config = useRuntimeConfig()
//console.log('Runtime Config:', config)
</script>
<template>
  <UApp :toaster="{ position: 'top-right', duration: 2000 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

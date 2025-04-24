<template>
  <div>
    <div class="scrollnavbar">
      <div class="version-text">version: {{ version }}</div>
      <v-list class="pt-0 pr-4 pb-4 pl-4">
        <!-- ---------------------------------------------- -->
        <!---Menu Loop -->
        <!-- ---------------------------------------------- -->
        <template v-for="(item, i) in sidebarMenu" :key="i">
          <!-- ---------------------------------------------- -->
          <!---Single Item-->
          <!-- ---------------------------------------------- -->
          <v-list-item :to="item.to" rounded="lg" class="mb-1">
            <template v-slot:prepend>
              <v-icon :icon="item.icon"></v-icon>
            </template>
            <v-list-item-title v-text="item.title"></v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import sidebarItems from "./sidebarItems";
const sidebarMenu = ref(sidebarItems);

const version = ref(import.meta.env.VITE_APP_VERSION || "0.2.0-DEV");
</script>

<style scoped>
.version-text {
  display: flex;
  justify-content: center; /* Center horizontally */
  align-items: center; /* Center vertically */
  height: 50px; /* Adjust height as needed */
  font-size: 16px; /* Adjust font size as needed */
  font-weight: bold; /* Optional: Make the text bold */
  text-align: center; /* Ensure text alignment */
  padding-bottom: 0px;
}
</style>

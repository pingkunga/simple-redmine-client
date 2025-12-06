<template>
  <v-app>
    <!-- Header -->
    <v-app-bar>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Redmine Client Tools</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <!-- Sidebar -->
      <v-navigation-drawer
        v-model="drawer"
        left
        elevation="10"
        app
        :permanent="isLgAndUp"
        :clipped="isLgAndUp"
        :temporary="isMdAndDown"
        :location="$vuetify.display.mobile ? 'bottom' : undefined"
      >
        <sidebar />
      </v-navigation-drawer>

      <!-- Main content -->
      <v-container fluid class="page-wrapper">
        <NuxtPage />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useDisplay } from "vuetify";

const drawer = ref(false);

const { mdAndDown, lgAndUp } = useDisplay();

const isMdAndDown = computed(() => mdAndDown.value);
const isLgAndUp = computed(() => lgAndUp.value);

// Set the initial state of the drawer based on the screen size
onMounted(() => {
  drawer.value = isLgAndUp.value;
});
</script>

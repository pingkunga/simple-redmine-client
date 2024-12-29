<template>
    <v-app>
        <!-- Header -->
        <v-app-bar>
            <!-- <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon> -->
            <v-toolbar-title>Redmine Client Tools</v-toolbar-title>
        </v-app-bar>
       
        <v-main>
            <!-- Sidebar -->
            <v-navigation-drawer
                    left
                    elevation="10"
                    app
                    expand-on-hover
                >
                Sidebar
            </v-navigation-drawer>

            <!-- Main content -->
            <v-container fluid class="page-wrapper">
                <NuxtPage />
            </v-container>
        </v-main>
    </v-app>
  </template>
  
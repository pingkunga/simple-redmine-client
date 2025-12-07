import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  /*
  ** ENV File
  NUXT_REDMINE_TOKEN=your_token
  */

  runtimeConfig: {
    public: {
      redmineUrl: "https://redmine.example.com",
      appVersion: "0.2.0-DEV"
    },
    redmineToken: "no_token"
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui'
  ],
  vite: {
    plugins: [tailwindcss()]
  },

  typescript: {
    tsConfig: {
      include: ['../types/**/*'],
    },
  },

  imports: {
    dirs: ['types/*.ts', 'store/*.ts', 'types/**/*.ts'],
  },
})

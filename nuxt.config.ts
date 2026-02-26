import tailwindcss from "@tailwindcss/vite";


// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    redmineToken: "no_token",
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "user@example.com",
    smtpPass: "password",
    smtpFrom: "noreply@example.com",
    notifyReleaseMailApiKey: "",
    notifyReleaseMailAllowedIps: "",
    adminUser: "admin",
    adminPass: "password",
    adminSessionSecret: "a-very-secret-key-12345",
    public: {
      redmineUrl: "https://redmine.example.com",
      appVersion: "0.3.0-DEV"
    },
  },
  compatibilityDate: "2025-07-15",
  css: ['./app/assets/css/main.css'],
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
  ],
  vite: {
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: { 
        'vue': 'vue' },
      dedupe: ['vue']
    }
  },
  sourcemap: { 
    server: true,
    client: true,
  },
})


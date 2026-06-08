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
    adminSessionSecure: true,
    gitlabToken: process.env.GITLAB_TOKEN || "no_token",
    // GitLab Cache Configuration
    gitlabCacheMode: process.env.GITLAB_CACHE_MODE || "file", // "file" | "mongodb"
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/redmine-client",
    gitlabCacheDir: process.env.GITLAB_CACHE_DIR || "./data/gitlab-cache",
    
    public: {
      redmineUrl: "https://redmine.example.com",
      appVersion: "0.3.0-DEV",
      internalApiKey: "SAMPLE_INTERNAL_KEY", // This should be overridden in .env for production
      gitlabUrl: "http://dev.gutusr.local",
    },
  },
  compatibilityDate: "2025-07-15",
  css: ['./app/assets/css/main.css'],
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
  ],
  nitro: {
    externals: {
      external: ['xlsx'] 
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['xlsx'] 
    },
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


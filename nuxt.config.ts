import tailwindcss from "@tailwindcss/vite";


// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    redmineToken: "no_token",
    jenkinsUrl: process.env.JENKINS_URL || "",
    jenkinsJob: process.env.JENKINS_JOB || "ADHOCVERSIONGEN",
    jenkinsUser: process.env.JENKINS_USER || "",
    jenkinsToken: process.env.JENKINS_TOKEN || "",
    jenkinsCacheDir: process.env.JENKINS_CACHE_DIR || "./data/jenkins-cache",
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "user@example.com",
    smtpPass: "password",
    smtpFrom: "noreply@example.com",
    automationApiKey: "",
    automationAllowedIps: "",
    mcpApiKey: "", // NUXT_MCP_API_KEY; empty = /api/mcp stays closed
    // LLM for /api/chat (NUXT_LLM_PROVIDER, NUXT_LLM_MODEL, NUXT_LLM_API_KEY, NUXT_LLM_ENDPOINT).
    // llmProvider: anthropic | google | openai | azure | ollama | lmstudio; empty = chat disabled.
    // llmEndpoint: required for azure (e.g. https://<res>.openai.azure.com/openai/v1, or
    // https://<res>.openai.azure.com/openai?api-version=2024-10-21); optional override for
    // anthropic/google/openai; defaults to localhost for ollama/lmstudio.
    llmProvider: "",
    llmModel: "", // model id (azure: the deployment name)
    llmApiKey: "", // not needed for ollama/lmstudio
    llmEndpoint: "",
    // /api/chat abuse limits (in-memory, per process): per client per minute / per client per day / whole system per day
    chatRatePerMinute: 10,
    chatDailyLimitPerIp: 20,
    chatDailyLimit: 100,
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

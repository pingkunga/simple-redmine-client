import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from "path";

export default defineVitestConfig({
  test: {
    globals: true,
    //environment: 'jsdom',
    environment: 'nuxt',

    //Adde this to avoid error: TypeError: Cannot read properties of undefined (reading 'url')
    environmentOptions: {
      nuxt: {
        dotenv: {
          fileName: '.env.test',
        },
        overrides: {
          // Nuxt's app manifest fetch runs on a timer; on a fast CI runner it fires after the test
          // environment is torn down ("$fetch is not defined") and fails the run. Tests don't need it.
          experimental: { appManifest: false },
        },
      },
    },
    setupFiles: "./vitest.setup.ts", // Add the setup file here

    reporters: ['default', 'json'], // Use 'json' to generate a JSON report
    outputFile: 'vitest-report.json', // Specify the output file for the report
  },
  resolve: {
    alias: {
      '~': '.',
      '@': '.',
    },
  },
});
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
          // Your overrides here
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
## Plan: Migrate to Nuxt UI 4

Remove Vuetify and integrate Nuxt UI 4 for improved Nuxt 4 compatibility, ensuring modern UI components and better performance. Update config, install dependencies, replace components, and test.

### Steps
1. Install @nuxt/ui via `bun add @nuxt/ui` and remove Vuetify packages like `bun remove vuetify`.
2. Update `nuxt.config.ts` with removed Vuetify imports/modules and added `@nuxt/ui` module.
3. Replace Vuetify components in `app/components/Snackbar.vue` and `app/components/sidebar/Sidebar.vue` with Nuxt UI equivalents.
4. Update layouts in `app/layouts/default.vue` and pages like `app/pages/index.vue` to use Nuxt UI components.
5. Run `bun run dev` to test the application and verify UI migration.

## Plan: Migrate to Nuxt UI 4

Remove Vuetify and integrate Nuxt UI 4 for improved Nuxt 4 compatibility, ensuring modern UI components and better performance. Update config, install dependencies, replace components, and test.

### Steps
1. Install @nuxt/ui via `bun add @nuxt/ui` and remove Vuetify packages like `bun remove vuetify`.
2. Update `nuxt.config.ts` with removed Vuetify imports/modules and added `@nuxt/ui` module.
3. Replace Vuetify components in `app/components/Snackbar.vue` and `app/components/sidebar/Sidebar.vue` with Nuxt UI equivalents.
4. Update layouts in `app/layouts/default.vue` and pages like `app/pages/index.vue` to use Nuxt UI components.
5. Run `bun run dev` to test the application and verify UI migration.

### Component Mappings
Based on Nuxt UI docs, here are mappings for common Vuetify components to Nuxt UI equivalents (not direct replacements, as libraries differ):

- **v-btn** → **UButton** (e.g., `<UButton color="primary" variant="solid" icon="i-lucide-rocket">Launch</UButton>`)
- **v-text-field** → **UInput** (e.g., `<UInput v-model="value" placeholder="Search..." icon="i-lucide-search" />`)
- **v-checkbox** → **UCheckbox** (e.g., `<UCheckbox label="Accept terms" />`)
- **v-radio** → **URadioGroup** (e.g., `<URadioGroup v-model="value" :items="['Option 1', 'Option 2']" />`)
- **v-switch** → **USwitch** (e.g., `<USwitch v-model="enabled" />`)
- **v-select** → **USelect** (e.g., `<USelect v-model="selected" :items="['Item 1', 'Item 2']" />`)
- **v-card** → **UCard** (e.g., `<UCard variant="outline"><template #header>Header</template>Content<template #footer>Footer</template></UCard>`)
- **v-app-bar** → **UHeader** (e.g., `<UHeader title="My App"><UNavigationMenu :items="navItems" /></UHeader>`)
- **v-navigation-drawer** → Custom (use UHeader with mode="drawer" or UModal for sidebar)
- **v-modal** → **UModal** (e.g., `<UModal title="Confirm Action"><template #body>Are you sure?</template></UModal>`)
- **v-menu** → **UDropdownMenu** (e.g., `<UDropdownMenu :items="menuItems" />`)
- **v-tabs** → **UTabs** (e.g., `<UTabs :items="tabs" />`)
- **v-data-table** → **UTable** (e.g., `<UTable :data="data" :columns="columns" />`)

### Further Considerations
1. Check for custom Vuetify styles in `app/plugins/vuetify.ts` to migrate or remove.
2. Any specific components or pages to prioritize for replacement?

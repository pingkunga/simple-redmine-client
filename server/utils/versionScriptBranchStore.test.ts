import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { deleteScriptBranch, getScriptBranchMap, setScriptBranch } from './versionScriptBranchStore'

const metaDirectory = `.data/version-meta-test-${Date.now()}`

const runtimeConfig = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig.value)

describe('versionScriptBranchStore', () => {
  beforeEach(() => {
    runtimeConfig.value = { versionMetaDir: metaDirectory }
  })

  afterEach(async () => {
    await fs.rm(path.join(process.cwd(), metaDirectory), { recursive: true, force: true })
  })

  it('returns an empty map when the file does not exist', async () => {
    expect(await getScriptBranchMap()).toEqual({})
  })

  it('stores, overwrites and deletes a branch per version id', async () => {
    await setScriptBranch(101, 'master')
    await setScriptBranch(102, 'release/8.9')
    await setScriptBranch(101, 'develop')

    const map = await getScriptBranchMap()
    expect(map['101']?.scriptBranch).toBe('develop')
    expect(map['102']?.scriptBranch).toBe('release/8.9')

    await deleteScriptBranch(101)
    expect(Object.keys(await getScriptBranchMap())).toEqual(['102'])
  })

  it('ignores deleting an unknown version', async () => {
    await expect(deleteScriptBranch(999)).resolves.toBeUndefined()
  })

  it('fails loudly on a corrupt file instead of dropping data', async () => {
    const dir = path.join(process.cwd(), metaDirectory)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'version-script-branch.json'), '{not json', 'utf8')

    await expect(getScriptBranchMap()).rejects.toMatchObject({ statusCode: 500 })
  })
})

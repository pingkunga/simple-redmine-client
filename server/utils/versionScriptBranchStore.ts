import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

// Redmine has no field for this, so the branch each Version's script folder was committed to lives here.
const fileName = 'version-script-branch.json'

export interface VersionScriptBranchEntry {
  scriptBranch: string
  updatedAt: string
}

export type VersionScriptBranchMap = Record<string, VersionScriptBranchEntry>

const getFilePath = () => {
  const config = useRuntimeConfig()
  return path.join(process.cwd(), config.versionMetaDir, fileName)
}

const readMap = async (): Promise<VersionScriptBranchMap> => {
  try {
    const parsed = JSON.parse(await fs.readFile(getFilePath(), 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to read Script Branch data'
    })
  }
}

const writeMap = async (map: VersionScriptBranchMap) => {
  const filePath = getFilePath()
  const tempFilePath = `${filePath}.${randomUUID()}.tmp`

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(tempFilePath, JSON.stringify(map, null, 2), 'utf8')

  try {
    await fs.rename(tempFilePath, filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }

    await fs.rm(filePath, { force: true })
    await fs.rename(tempFilePath, filePath)
  }
}

export const getScriptBranchMap = readMap

export const setScriptBranch = async (versionId: number | string, scriptBranch: string) => {
  const map = await readMap()
  map[String(versionId)] = { scriptBranch, updatedAt: new Date().toISOString() }
  await writeMap(map)
}

export const deleteScriptBranch = async (versionId: number | string) => {
  const map = await readMap()
  if (!(String(versionId) in map)) return

  delete map[String(versionId)]
  await writeMap(map)
}

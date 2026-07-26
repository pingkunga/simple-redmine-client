import fs from 'fs'
import path from 'path'

const NUMERIC_KEYS = ['[BNZPROJECTID]', '[BNZTRACKERID]', '[BNZASSIGNEDTOID]', '[BNZFIXEDVERSIONID]']

const readDevTrackerTemplate = async (fileName: string): Promise<string> => {
    const filePath = path.join(process.cwd(), 'public', 'IssueTemplate', fileName)
    return await fs.promises.readFile(filePath, 'utf-8')
}

export const replaceAllJson = (text: string, replacements: Record<string, string>): string => {
    let output = text
    Object.entries(replacements).forEach(([key, value]) => {
        const rawValue = value ?? ''

        if (rawValue === '') {
            output = output.split(key).join(NUMERIC_KEYS.includes(key) ? 'null' : '""')
            return
        }

        const escapedValue = /^-?\d+$/.test(rawValue) ? rawValue : JSON.stringify(rawValue).slice(1, -1)
        output = output.split(key).join(escapedValue)
    })
    return output
}

export const renderDevTrackerPayload = async (
    templateFileName: string,
    replacements: Record<string, string>
) => {
    const jsonTemplate = await readDevTrackerTemplate(templateFileName)
    return JSON.parse(replaceAllJson(jsonTemplate, replacements))
}

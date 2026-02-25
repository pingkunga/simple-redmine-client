import fs from 'fs/promises'
import path from 'path'

export const PLACEHOLDERS = [
  'versionText',
  'wikiFullURL',
  'ownerTeam',
  'nextWeekReleaseVersion',
  'versionDueDateText',
  'version',
  'currentReleaseBranch',
]

export async function loadTemplate(): Promise<string> {
  const p = path.join(process.cwd(), 'public', 'MailTemplate', 'ReleaseMail.html')
  return fs.readFile(p, 'utf8')
}

export async function saveTemplate(content: string): Promise<void> {
  const p = path.join(process.cwd(), 'public', 'MailTemplate', 'ReleaseMail.html')
  await fs.writeFile(p, content, 'utf8')
}

/**
 * Normalize common placeholder syntaxes to {{name}}.
 * Supports: {{name}}, [[name]], %name%, $name$, <% name %>, $($currentVersion.name)
 */
export function standardizePlaceholders(template: string): string {
  return template.replace(/(?:\{\{\s*([A-Za-z0-9_]+)\s*\}\}|\[\[\s*([A-Za-z0-9_]+)\s*\]\]|%([A-Za-z0-9_]+)%|\$([A-Za-z0-9_]+)\$|<%\s*([A-Za-z0-9_]+)\s*%>|\$\(\s*\$currentVersion\.([A-Za-z0-9_]+)\s*\))/g, (_m, g1, g2, g3, g4, g5, g6) => {
    const name = g1 || g2 || g3 || g4 || g5 || g6
    return `{{${name}}}`
  })
}

/**
 * Replace <mark> tags with <span> for email compatibility.
 */
export function convertMarkToSpan(template: string): string {
  // Convert opening <mark> or <mark ...> to <span ...>
  // and </mark> to </span>
  return template
    .replace(/<mark(\s+[^>]*)?>/gi, (_match, group1) => {
      const attrs = group1 || ''
      return `<span${attrs}>`
    })
    .replace(/<\/mark>/gi, '</span>')
}

/**
 * If required placeholders are missing, prepend an HTML comment listing them.
 */
export function ensurePlaceholdersPresent(template: string, required = PLACEHOLDERS): string {
  const missing = required.filter(p => !new RegExp(`{{\\s*${p}\\s*}}`).test(template))
  if (missing.length === 0) return template
  const comment = `<!-- Missing placeholders: ${missing.join(', ')} -->\n`
  return comment + template
}

export async function loadAndStandardize(): Promise<string> {
  const raw = await loadTemplate()
  const standardized = standardizePlaceholders(raw)
  return ensurePlaceholdersPresent(standardized)
}

export default {
  loadTemplate,
  saveTemplate,
  standardizePlaceholders,
  convertMarkToSpan,
  ensurePlaceholdersPresent,
  loadAndStandardize,
  PLACEHOLDERS,
}
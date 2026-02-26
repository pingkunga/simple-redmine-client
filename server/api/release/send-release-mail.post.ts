import { sendMail } from '~~/server/utils/mailer';
import { loadAndStandardize, standardizePlaceholders, convertMarkToSpan } from '~~/server/utils/releaseMailTemplate';
import { getThisWeekVersions } from '~~/server/utils/releaseService';
import type { VersionWithReleaseNotes } from '~~/shared/types/Version';

export default defineEventHandler(async (event) => {

  const body = await readBody(event);
  const { projectId, versionId, recipients: _recipients, to, template: _template } = body;

  const recipients = Array.isArray(_recipients) ? _recipients : (Array.isArray(to) ? to : (to ? [to] : []));

  if ((!projectId && !versionId) || recipients.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request: projectId/versionId and recipients/to required' });
  }

  try {
    let version: VersionWithReleaseNotes | undefined;

    if (versionId) {
      // Find specific version if versionId provided (useful for Test)
      const allVersions = await getThisWeekVersions(event, projectId || 0);
      version = allVersions.find(v => v.id === versionId);
    } else {
      const versions = await getThisWeekVersions(event, projectId);
      if (versions.length > 0) {
        version = versions[0];
      }
    }

    if (!version) {
      throw createError({ statusCode: 404, statusMessage: 'No version found' });
    }

    // Use template from body (for Designer Test) or load from file
    let html = '';
    if (_template && _template.body) {
      // Combine body and style from the designer if provided
      const style = _template.style || '';
      
      html = `<html><head><style>${style}</style></head><body><div class="mail-content">${_template.body}</div></body></html>`;
    } else {
      html = await loadAndStandardize();
    }

    // Standardize placeholders in the final HTML
    html = standardizePlaceholders(html);
    // Convert <mark> to <span> for email compatibility
    //console.log('HTML before converting <mark>:', html);
    html = convertMarkToSpan(html);
    //console.log('HTML after converting <mark>:', html);

    // Replace placeholders
    Object.keys(version).forEach(key => {
      const value = (version as any)[key];
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), stringValue);
      }
    });

    // Send mail
    await sendMail({
      to: recipients,
      subject: `Release Notification: ${version.versionText}`,
      html,
    });

    return { success: true, message: 'Mail sent successfully' };
  } catch (error) {
    console.error('Error sending release mail:', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to send mail' });
  }
});
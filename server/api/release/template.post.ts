import { saveTemplate } from "~~/server/utils/releaseMailTemplate";

export default defineEventHandler(async (event) => {
    const { style, body } = await readBody(event);
    
    // Reconstruct full HTML
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<style>
${style}
</style>
</head>
<body>
${body}
</body>
</html>`;

    await saveTemplate(fullHtml);
    return { success: true };
});

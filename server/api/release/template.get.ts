import { loadTemplate } from "~~/server/utils/releaseMailTemplate";

export default defineEventHandler(async (event) => {
    const raw = await loadTemplate();
    
    // Extract CSS in <style> and content in <body>
    const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/);
    const bodyMatch = raw.match(/<body>([\s\S]*?)<\/body>/);
    
    return {
        style: styleMatch ? styleMatch[1].trim() : '',
        body: bodyMatch ? bodyMatch[1].trim() : raw
    };
});

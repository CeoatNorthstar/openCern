import { readFileSync, existsSync } from 'fs';
import { anthropicService } from '../services/anthropic.js';
export async function askQuestion(question, options, context, onToken, signal) {
    let message = question;
    if (options.file) {
        if (!existsSync(options.file)) {
            throw new Error(`File not found: ${options.file}`);
        }
        const content = readFileSync(options.file, 'utf-8');
        const truncated = content.length > 50_000
            ? content.slice(0, 50_000) + '\n...[truncated]'
            : content;
        message = `${question}\n\nFile: ${options.file}\n\`\`\`json\n${truncated}\n\`\`\``;
    }
    if (options.explain) {
        message = `Please explain the results from the last operation in detail. ${message}`;
    }
    anthropicService.addContext(context);
    return anthropicService.streamMessage(message, onToken, signal);
}
export function clearConversation() {
    anthropicService.clearHistory();
}
//# sourceMappingURL=ask.js.map
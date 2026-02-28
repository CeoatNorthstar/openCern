import React from 'react';
interface PromptProps {
    onSubmit: (input: string) => void;
    disabled?: boolean;
    placeholder?: string;
}
export declare function PromptComponent({ onSubmit, disabled, placeholder }: PromptProps): React.JSX.Element;
export declare const Prompt: React.MemoExoticComponent<typeof PromptComponent>;
export default Prompt;
//# sourceMappingURL=Prompt.d.ts.map
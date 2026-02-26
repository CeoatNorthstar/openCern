import React from 'react';
interface PromptProps {
    onSubmit: (input: string) => void;
    onTab?: (partial: string) => void;
    onSlash?: () => void;
    disabled?: boolean;
    placeholder?: string;
}
export declare function Prompt({ onSubmit, onTab, onSlash, disabled, placeholder }: PromptProps): React.JSX.Element;
export default Prompt;
//# sourceMappingURL=Prompt.d.ts.map
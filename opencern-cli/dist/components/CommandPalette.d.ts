import React from 'react';
interface CommandPaletteProps {
    query: string;
    onSelect: (command: string) => void;
    onDismiss: () => void;
}
export declare function CommandPalette({ query, onSelect, onDismiss }: CommandPaletteProps): React.JSX.Element;
export default CommandPalette;
//# sourceMappingURL=CommandPalette.d.ts.map
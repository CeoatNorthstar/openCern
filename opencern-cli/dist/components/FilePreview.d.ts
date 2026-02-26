import React from 'react';
interface FilePreviewProps {
    content: string;
    filename?: string;
    size?: number;
    fileType?: 'json' | 'text' | 'root-meta';
    onClose?: () => void;
    focused?: boolean;
}
export declare function FilePreview({ content, filename, size, fileType, onClose, focused, }: FilePreviewProps): React.JSX.Element;
export default FilePreview;
//# sourceMappingURL=FilePreview.d.ts.map
import React from 'react';
export interface Column {
    key: string;
    label: string;
    width?: number;
    align?: 'left' | 'right';
    format?: (val: unknown) => string;
}
interface DataTableProps {
    columns: Column[];
    rows: Record<string, unknown>[];
    onSelect?: (row: Record<string, unknown>) => void;
    maxRows?: number;
    title?: string;
    focused?: boolean;
}
export declare function DataTable({ columns, rows, onSelect, maxRows, title, focused, }: DataTableProps): React.JSX.Element;
export default DataTable;
//# sourceMappingURL=DataTable.d.ts.map
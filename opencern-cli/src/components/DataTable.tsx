import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

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

function truncate(str: string, len: number): string {
  if (str.length <= len) return str.padEnd(len);
  return str.slice(0, len - 3) + '...';
}

function formatValue(val: unknown): string {
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1e9) return val.toExponential(2);
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M';
    if (Math.abs(val) >= 1e3) return val.toFixed(0);
    if (Math.abs(val) < 0.01 && val !== 0) return val.toExponential(2);
    return val.toFixed(2);
  }
  if (val === null || val === undefined) return '—';
  return String(val);
}

export function DataTable({
  columns,
  rows,
  onSelect,
  maxRows = 20,
  title,
  focused = true,
}: DataTableProps): React.JSX.Element {
  const [selectedRow, setSelectedRow] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const visible = rows.slice(scrollOffset, scrollOffset + maxRows);
  const colWidths = columns.map(col => col.width || Math.max(col.label.length + 2, 10));

  useInput((_input, key) => {
    if (!focused) return;
    if (key.upArrow) {
      if (selectedRow > 0) {
        setSelectedRow(i => i - 1);
        if (selectedRow - 1 < scrollOffset) setScrollOffset(o => Math.max(0, o - 1));
      }
      return;
    }
    if (key.downArrow) {
      if (selectedRow < rows.length - 1) {
        setSelectedRow(i => i + 1);
        if (selectedRow + 1 >= scrollOffset + maxRows) setScrollOffset(o => o + 1);
      }
      return;
    }
    if (key.return && onSelect) {
      onSelect(rows[selectedRow]);
    }
  });

  function renderCell(col: Column, val: unknown, width: number): string {
    const formatted = col.format ? col.format(val) : formatValue(val);
    return truncate(formatted, width);
  }

  return (
    <Box flexDirection="column">
      {title && <Text bold color="blue"> {title}</Text>}
      <Box flexDirection="row">
        {columns.map((col, i) => (
          <Text key={col.key} bold color="blue"> {truncate(col.label, colWidths[i])} </Text>
        ))}
      </Box>
      <Box flexDirection="row">
        {colWidths.map((w, i) => (
          <Text key={i} color="gray">{'─'.repeat(w + 2)}</Text>
        ))}
      </Box>
      {visible.map((row, rowIdx) => {
        const absIdx = rowIdx + scrollOffset;
        const isSelected = focused && absIdx === selectedRow;
        return (
          <Box key={rowIdx} flexDirection="row">
            {columns.map((col, i) => (
              <Text
                key={col.key}
                color={isSelected ? 'cyan' : rowIdx % 2 === 0 ? 'white' : 'gray'}
                bold={isSelected}
              >
                {isSelected && i === 0 ? '▶' : ' '}{renderCell(col, row[col.key], colWidths[i])}{' '}
              </Text>
            ))}
          </Box>
        );
      })}
      {rows.length > maxRows && (
        <Text color="gray" dimColor>
          {' '}Showing {scrollOffset + 1}–{Math.min(scrollOffset + maxRows, rows.length)} of {rows.length}
        </Text>
      )}
      {onSelect && focused && <Text color="gray" dimColor> ↑↓ navigate · Enter select</Text>}
    </Box>
  );
}

export default DataTable;

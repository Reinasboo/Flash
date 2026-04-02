'use client';

import React from 'react';
import clsx from 'clsx';

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: any) => void;
  hoverable?: boolean;
  striped?: boolean;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  isLoading = false,
  emptyState = 'No data available',
  onRowClick,
  hoverable = true,
  striped = true,
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-6 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap',
                  alignClasses[col.align || 'left']
                )}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && (
                    <span className="text-gray-400 cursor-pointer hover:text-gray-600">↕</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin">
                    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-gray-100',
                  onRowClick && 'cursor-pointer',
                  hoverable && 'hover:bg-primary-50 transition-colors duration-200',
                  striped && rowIdx % 2 === 1 && 'bg-gray-50'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-6 py-4 text-sm text-gray-900',
                      alignClasses[col.align || 'left']
                    )}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

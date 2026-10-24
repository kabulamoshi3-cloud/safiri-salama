import React from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField?: keyof T;
}

export default function Table<T extends object>({
  columns,
  rows,
  keyField,
}: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '2px solid var(--color-border)',
              background: 'var(--color-gray-bg)',
            }}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const rowKey = keyField
                ? String(row[keyField])
                : String(idx);
              return (
                <tr
                  key={rowKey}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--color-gray-bg)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      '')
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ padding: '10px 12px', verticalAlign: 'middle' }}
                    >
                      {col.render
                        ? col.render(row)
                        : col.key in (row as Record<string, unknown>)
                        ? String(((row as Record<string, unknown>)[col.key]) ?? '—')
                        : '—'}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

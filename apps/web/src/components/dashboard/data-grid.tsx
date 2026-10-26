'use client';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme } from 'next-themes';
export function DataTable({
  rows,
  columns,
  total,
  page,
  onPage,
  loading,
}: {
  rows: any[];
  columns: GridColDef[];
  total: number;
  page: number;
  onPage: (page: number) => void;
  loading?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const theme = createTheme({
    palette: { mode: resolvedTheme === 'dark' ? 'dark' : 'light', primary: { main: '#2563eb' } },
    typography: { fontFamily: 'Arial, sans-serif', fontSize: 12 },
    shape: { borderRadius: 8 },
  });
  return (
    <ThemeProvider theme={theme}>
      <div className="hidden h-[600px] w-full md:block">
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page: page - 1, pageSize: 25 }}
          onPaginationModelChange={(m: GridPaginationModel) => onPage(m.page + 1)}
          pageSizeOptions={[25]}
          loading={loading}
          disableRowSelectionOnClick
          sx={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        />
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded border p-4">
            {columns
              .filter((c) => c.field !== 'actions')
              .map((c) => (
                <div key={c.field} className="mb-3 flex justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{c.headerName}</span>
                  <span className="text-right">
                    {typeof row[c.field] === 'object'
                      ? JSON.stringify(row[c.field])
                      : String(row[c.field] ?? '—')}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </ThemeProvider>
  );
}

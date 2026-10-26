'use client';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme } from 'next-themes';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export function UtcDateTimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: resolvedTheme === 'dark' ? 'dark' : 'light',
          primary: { main: '#2563eb' },
        },
        typography: { fontFamily: 'inherit', fontSize: 12 },
      })}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateTimePicker
          label={label}
          timezone="UTC"
          value={value ? dayjs.utc(value) : null}
          onChange={(date) => {
            if (date?.isValid()) onChange(date.toISOString());
          }}
          slotProps={{ textField: { size: 'small', fullWidth: true, required: true } }}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
}

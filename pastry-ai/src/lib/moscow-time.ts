const DATETIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const MOSCOW_UTC_OFFSET_HOURS = 3;

export function parseMoscowDateTimeLocalValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = DATETIME_LOCAL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - MOSCOW_UTC_OFFSET_HOURS,
      Number(minute),
    ),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

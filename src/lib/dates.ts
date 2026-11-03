const longDateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatReleaseDate(iso: string | null): string {
  return iso ? longDateFormatter.format(parseIsoDate(iso)) : 'Fecha por confirmar';
}

export function formatWeekdayDate(iso: string): string {
  return capitalize(weekdayFormatter.format(parseIsoDate(iso)));
}

export function formatMonthYear(date: Date): string {
  return capitalize(monthFormatter.format(date));
}

export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

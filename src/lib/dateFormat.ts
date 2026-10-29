/** Display dates as DD-MM-AAAA while keeping ISO YYYY-MM-DD for storage and comparisons. */
export function formatDateDMY(value?: string | null): string {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
export function normalizeDateDMY(value: string): string {
  const v = value.trim();
  const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return v;
}
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return d.getUTCFullYear()===Number(value.slice(0,4)) && d.getUTCMonth()+1===Number(value.slice(5,7)) && d.getUTCDate()===Number(value.slice(8,10));
}

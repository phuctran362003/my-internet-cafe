export function formatMoney(value) {
  const amount = Math.round(Number(value) || 0);
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${digits}đ`;
}

export function formatClock(totalMinutes) {
  let minutes = Math.floor(totalMinutes);
  if (minutes >= 1440) minutes -= 1440;
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatDate(day) {
  const date = new Date(Date.UTC(2026, 0, 1));
  date.setUTCDate(day);
  return date.toISOString().slice(0, 10);
}

export function fillTemplate(text, vars) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] == null ? '' : String(vars[key])));
}

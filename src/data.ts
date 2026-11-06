export const categories = {
  expense: ['食費', '日用品', '交通費', '住居費', '光熱費', '娯楽', '医療費', 'その他'],
  income: ['給与', '副収入', 'お小遣い', 'その他'],
};
export type Entry = { id: string; type: 'income' | 'expense'; date: string; amount: number; category: string; memo: string };
export const STORAGE_KEY = 'kotsukotsu-entries-v1';
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function validEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Entry;
  if (e.type !== 'income' && e.type !== 'expense') return false;
  const d = new Date(`${e.date}T00:00:00Z`);
  return typeof e.id === 'string' && !!e.id && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && !isNaN(d.getTime()) && d.toISOString().slice(0,10) === e.date && Number.isSafeInteger(e.amount) && e.amount > 0 && e.amount <= 999999999 && categories[e.type].includes(e.category) && typeof e.memo === 'string' && e.memo.length <= 100;
}
export function readEntries(): Entry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(validEntry) || new Set(parsed.map(e => e.id)).size !== parsed.length) throw new Error('invalid data');
  return parsed;
}
export function summarize(entries: Entry[]) {
  const income = entries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const expense = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  return { income, expense, balance: income-expense };
}

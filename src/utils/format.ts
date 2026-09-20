/** 数字安全解析：非法/空值回退到 0 */
export function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 时间戳 → YYYY-MM-DD */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 判断某个时间戳是否属于本月 */
export function isCurrentMonth(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/** 判断 ISO 日期字符串 a 是否 <= b（YYYY-MM-DD 可直接字典序比较） */
export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b
}

/** 当前日期 YYYY-MM-DD */
export function today(): string {
  return formatDate(Date.now())
}

/** 判断是否已逾期：期望归还日期 < 今天且未归还 */
export function isOverdue(expectedReturnDate: string): boolean {
  return expectedReturnDate < today()
}

/** YYYY-MM-DD → 当日 00:00 的时间戳（本地时区） */
export function parseDate(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime()
}

/** 在给定时间戳上加减整天数，返回新的时间戳 */
export function addDays(ts: number, days: number): number {
  return ts + days * 24 * 60 * 60 * 1000
}

/** 按整天计算 b - a（忽略时分秒），b 为今天时表示距 a 还有/已过多少天 */
export function diffDays(a: number, b: number): number {
  const dayMs = 24 * 60 * 60 * 1000
  const da = new Date(a)
  const db = new Date(b)
  const startA = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime()
  const startB = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime()
  return Math.round((startB - startA) / dayMs)
}

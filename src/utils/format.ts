import type { Tool, ToolMaintenanceInfo, MaintenanceDueStatus } from '../types'

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

/** YYYY-MM-DD → 本地日期对象，使用正午避免夏令时导致日期偏移 */
export function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0)
}

/** 日期增加指定天数，返回 YYYY-MM-DD */
export function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + days)
  return formatDate(d.getTime())
}

/** 两个日期相差天数：target - base（YYYY-MM-DD） */
export function diffDays(target: string, base: string): number {
  const ms = parseDate(target).getTime() - parseDate(base).getTime()
  return Math.round(ms / 86_400_000)
}

/** 计算工具保养状态；未设置保养周期时不纳入保养提醒 */
export function getMaintenanceInfo(tool: Tool): ToolMaintenanceInfo | null {
  const interval = toNumber(tool.maintenanceIntervalDays)
  if (interval <= 0) return null

  if (!tool.lastMaintainedDate) {
    return { dueDate: today(), daysUntilDue: 0, dueStatus: '待保养' }
  }

  const dueDate = addDays(tool.lastMaintainedDate, interval)
  const daysUntilDue = diffDays(dueDate, today())
  let dueStatus: MaintenanceDueStatus
  if (daysUntilDue < 0) dueStatus = '已逾期'
  else if (daysUntilDue === 0) dueStatus = '今日到期'
  else if (daysUntilDue <= 7) dueStatus = '即将到期'
  else dueStatus = '正常'

  return { dueDate, daysUntilDue, dueStatus }
}

/** 判断工具是否已到保养时间（含首次未记录、今日到期、已逾期） */
export function isMaintenanceDue(tool: Tool): boolean {
  const info = getMaintenanceInfo(tool)
  return !!info && ['待保养', '今日到期', '已逾期'].includes(info.dueStatus)
}

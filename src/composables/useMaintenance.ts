import type { Tool, MaintenanceStatus } from '../types'
import { MAINTENANCE_SOON_DAYS } from '../types'
import { addDays, diffDays } from '../utils/format'

/**
 * 工具保养计划的派生计算：下次保养时间、保养状态、剩余天数。
 * 纯函数逻辑，不读写数据，供 store / 视图复用。
 *
 * 起算规则：有上次保养记录则从上次保养算起；从未保养过时以入库时间为起算点。
 */
export function useMaintenance() {
  /** 是否已配置保养计划 */
  function hasSchedule(tool: Tool): boolean {
    return Number(tool.maintenanceCycleDays) > 0
  }

  /** 保养周期的起算时间：上次保养时间，从未保养过时回退到入库时间 */
  function maintenanceBaseAt(tool: Tool): number {
    return tool.lastMaintenanceAt ?? tool.createdAt
  }

  /** 下次应保养时间戳；未安排保养计划时返回 null */
  function nextMaintenanceAt(tool: Tool): number | null {
    if (!hasSchedule(tool)) return null
    return addDays(maintenanceBaseAt(tool), Number(tool.maintenanceCycleDays))
  }

  /** 距下次保养还剩多少天（负数表示已逾期天数）；未安排时返回 null */
  function daysUntilMaintenance(tool: Tool): number | null {
    const next = nextMaintenanceAt(tool)
    if (next === null) return null
    return diffDays(Date.now(), next)
  }

  /** 保养状态 */
  function maintenanceStatus(tool: Tool): MaintenanceStatus {
    const daysLeft = daysUntilMaintenance(tool)
    if (daysLeft === null) return 'unscheduled'
    if (daysLeft < 0) return 'overdue'
    if (daysLeft === 0) return 'due'
    if (daysLeft <= MAINTENANCE_SOON_DAYS) return 'upcoming'
    return 'ok'
  }

  return { hasSchedule, maintenanceBaseAt, nextMaintenanceAt, daysUntilMaintenance, maintenanceStatus }
}

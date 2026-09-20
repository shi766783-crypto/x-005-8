import { computed } from 'vue'
import type { Tool } from '../types'
import { useLocalStorage } from '../utils/storage'
import { uid } from '../utils/id'
import { toNumber, today, getMaintenanceInfo, isMaintenanceDue } from '../utils/format'

// 模块级单例状态：整个应用共享同一份工具库存
const tools = useLocalStorage<Tool[]>('diy.tools', [])

export function useToolStore() {
  function addTool(data: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Tool {
    const now = Date.now()
    const tool: Tool = { ...data, id: uid('tool_'), createdAt: now, updatedAt: now }
    tools.value.push(tool)
    return tool
  }

  function updateTool(id: string, patch: Partial<Omit<Tool, 'id' | 'createdAt'>>) {
    const tool = tools.value.find((t) => t.id === id)
    if (tool) Object.assign(tool, patch, { updatedAt: Date.now() })
  }

  /** 完成保养：记录本次保养日期，并以该日期重新计算下一次保养时间 */
  function completeMaintenance(id: string, maintainedDate = today()) {
    updateTool(id, { lastMaintainedDate: maintainedDate })
  }

  function removeTool(id: string) {
    tools.value = tools.value.filter((t) => t.id !== id)
  }

  function getTool(id: string): Tool | undefined {
    return tools.value.find((t) => t.id === id)
  }

  /** 工具总数：按数量累加（如 3 把螺丝刀算 3 件） */
  const totalQuantity = computed(() => tools.value.reduce((s, t) => s + toNumber(t.quantity), 0))

  /** 完好工具数量（按数量加权） */
  const intactQuantity = computed(() =>
    tools.value.filter((t) => t.status === '完好').reduce((s, t) => s + toNumber(t.quantity), 0),
  )

  /** 已设置保养周期的工具 */
  const maintenanceScheduledTools = computed(() =>
    tools.value.filter((t) => toNumber(t.maintenanceIntervalDays) > 0),
  )

  /** 已到保养时间的工具（待首次保养、今日到期、已逾期） */
  const maintenanceDueTools = computed(() =>
    maintenanceScheduledTools.value
      .filter(isMaintenanceDue)
      .sort((a, b) => {
        const infoA = getMaintenanceInfo(a)
        const infoB = getMaintenanceInfo(b)
        const daysA = infoA?.daysUntilDue ?? 0
        const daysB = infoB?.daysUntilDue ?? 0
        if (daysA !== daysB) return daysA - daysB
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      }),
  )

  /** 已逾期未保养的工具 */
  const maintenanceOverdueTools = computed(() =>
    maintenanceDueTools.value.filter((t) => getMaintenanceInfo(t)?.dueStatus === '已逾期'),
  )

  /** 工具完好率 = 完好数量 / 总数量（无工具时视为 0） */
  const intactRate = computed(() =>
    totalQuantity.value > 0 ? intactQuantity.value / totalQuantity.value : 0,
  )

  return {
    tools,
    addTool,
    updateTool,
    completeMaintenance,
    removeTool,
    getTool,
    totalQuantity,
    intactQuantity,
    intactRate,
    maintenanceScheduledTools,
    maintenanceDueTools,
    maintenanceOverdueTools,
  }
}

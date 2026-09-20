import { computed } from 'vue'
import type { Tool } from '../types'
import { useLocalStorage } from '../utils/storage'
import { uid } from '../utils/id'
import { toNumber } from '../utils/format'
import { useMaintenance } from '../composables/useMaintenance'

// 模块级单例状态：整个应用共享同一份工具库存
const tools = useLocalStorage<Tool[]>('diy.tools', [])

export function useToolStore() {
  const { nextMaintenanceAt, maintenanceStatus, daysUntilMaintenance } = useMaintenance()

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

  function removeTool(id: string) {
    tools.value = tools.value.filter((t) => t.id !== id)
  }

  function getTool(id: string): Tool | undefined {
    return tools.value.find((t) => t.id === id)
  }

  /** 完成一次保养：更新上次保养时间为现在 */
  function recordMaintenance(id: string) {
    updateTool(id, { lastMaintenanceAt: Date.now() })
  }

  /** 工具总数：按数量累加（如 3 把螺丝刀算 3 件） */
  const totalQuantity = computed(() => tools.value.reduce((s, t) => s + toNumber(t.quantity), 0))

  /** 完好工具数量（按数量加权） */
  const intactQuantity = computed(() =>
    tools.value.filter((t) => t.status === '完好').reduce((s, t) => s + toNumber(t.quantity), 0),
  )

  /** 工具完好率 = 完好数量 / 总数量（无工具时视为 0） */
  const intactRate = computed(() =>
    totalQuantity.value > 0 ? intactQuantity.value / totalQuantity.value : 0,
  )

  /** 已配置保养计划的工具 */
  const maintainedTools = computed(() => tools.value.filter((t) => toNumber(t.maintenanceCycleDays) > 0))

  /** 到期待保养（含今日到期）或已逾期的工具，按到期时间升序，逾期的排在最前 */
  const dueMaintenanceTools = computed(() =>
    maintainedTools.value
      .map((t) => {
        const nextAt = nextMaintenanceAt(t)
        return {
          tool: t,
          nextAt: nextAt as number,
          status: maintenanceStatus(t),
          daysLeft: daysUntilMaintenance(t),
        }
      })
      .filter((x) => x.status === 'overdue' || x.status === 'due')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1
        return a.nextAt - b.nextAt
      }),
  )

  /** 已逾期未保养的工具数（首页/看板醒目统计） */
  const overdueMaintenanceCount = computed(
    () => dueMaintenanceTools.value.filter((x) => x.status === 'overdue').length,
  )

  return {
    tools,
    addTool,
    updateTool,
    removeTool,
    getTool,
    recordMaintenance,
    totalQuantity,
    intactQuantity,
    intactRate,
    maintainedTools,
    dueMaintenanceTools,
    overdueMaintenanceCount,
  }
}

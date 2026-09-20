<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Tool } from '../types'
import type { MaintenanceStatus } from '../types'
import { TOOL_CATEGORIES, TOOL_STATUSES, MAINTENANCE_STATUS_META } from '../types'
import { useToolStore } from '../stores/useToolStore'
import { useBorrowStore } from '../stores/useBorrowStore'
import { useMaintenance } from '../composables/useMaintenance'
import { formatDate } from '../utils/format'
import ToolFormDialog from '../components/ToolFormDialog.vue'
import BorrowFormDialog from '../components/BorrowFormDialog.vue'

const toolStore = useToolStore()
const borrowStore = useBorrowStore()
const { nextMaintenanceAt, daysUntilMaintenance, maintenanceStatus } = useMaintenance()

const dialogVisible = ref(false)
const editingTool = ref<Tool | null>(null)
const borrowVisible = ref(false)

const filterCategory = ref('')
const filterStatus = ref('')
const filterMaintenance = ref<MaintenanceStatus | ''>('')
const keyword = ref('')

const filtered = computed(() =>
  toolStore.tools.value.filter((t) => {
    const matchCategory = !filterCategory.value || t.category === filterCategory.value
    const matchStatus = !filterStatus.value || t.status === filterStatus.value
    const matchMaintenance = !filterMaintenance.value || maintenanceStatus(t) === filterMaintenance.value
    const matchKeyword = !keyword.value || t.name.includes(keyword.value)
    return matchCategory && matchStatus && matchMaintenance && matchKeyword
  }),
)

function openAdd() {
  editingTool.value = null
  dialogVisible.value = true
}
function openEdit(tool: Tool) {
  editingTool.value = tool
  dialogVisible.value = true
}
async function remove(tool: Tool) {
  await ElMessageBox.confirm(`确定删除工具「${tool.name}」吗？`, '提示', { type: 'warning' })
  toolStore.removeTool(tool.id)
  ElMessage.success('已删除')
}

async function completeMaintenance(tool: Tool) {
  await ElMessageBox.confirm(`确认「${tool.name}」已完成本次保养吗？`, '完成保养', { type: 'info' })
  toolStore.recordMaintenance(tool.id)
  ElMessage.success('保养记录已更新')
}

function borrowedQty(toolId: string): number {
  return borrowStore.borrowedByTool.value[toolId] ?? 0
}

const statusTag = { 完好: 'success', 需维修: 'danger', 已借出: 'warning' } as const

/** 表格行样式：逾期未保养的整行标红，一眼可辨 */
function tableRowClassName({ row }: { row: Tool }): string {
  return maintenanceStatus(row) === 'overdue' ? 'maintenance-overdue-row' : ''
}

function maintenanceTag(status: MaintenanceStatus) {
  if (status === 'unscheduled') return null
  return MAINTENANCE_STATUS_META[status]
}

function nextDateText(tool: Tool): string {
  const next = nextMaintenanceAt(tool)
  return next ? formatDate(next) : '—'
}

/** 剩余/逾期天数文案，如「还剩 3 天」「逾期 5 天」「今天到期」 */
function daysText(tool: Tool): string {
  const days = daysUntilMaintenance(tool)
  if (days === null) return ''
  if (days < 0) return `逾期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `还剩 ${days} 天`
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">工具库存</h2>
      <div>
        <el-button type="primary" @click="borrowVisible = true">
          <el-icon><Share /></el-icon>&nbsp;登记借出
        </el-button>
        <el-button type="primary" @click="openAdd">
          <el-icon><Plus /></el-icon>&nbsp;添加工具
        </el-button>
      </div>
    </div>

    <div class="card filter-bar">
      <el-input v-model="keyword" placeholder="搜索工具名称" clearable style="width: 200px" />
      <el-select v-model="filterCategory" placeholder="全部类别" clearable style="width: 150px">
        <el-option v-for="c in TOOL_CATEGORIES" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 150px">
        <el-option v-for="s in TOOL_STATUSES" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="filterMaintenance" placeholder="保养状态" clearable style="width: 150px">
        <el-option label="未安排" value="unscheduled" />
        <el-option label="正常" value="ok" />
        <el-option label="即将到期" value="upcoming" />
        <el-option label="今日到期" value="due" />
        <el-option label="已逾期" value="overdue" />
      </el-select>
      <span class="muted">共 {{ toolStore.tools.value.length }} 件工具，合计 {{ toolStore.totalQuantity.value }} 件</span>
      <el-tag v-if="toolStore.overdueMaintenanceCount.value" type="danger" effect="dark">
        {{ toolStore.overdueMaintenanceCount.value }} 件工具逾期未保养
      </el-tag>
    </div>

    <div class="card">
      <el-table :data="filtered" border :row-class-name="tableRowClassName">
        <el-table-column label="照片" width="80" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.photo"
              :src="row.photo"
              fit="cover"
              style="width: 40px; height: 40px; border-radius: 4px"
              :preview-src-list="[row.photo]"
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="130" />
        <el-table-column prop="category" label="类别" width="100" />
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column label="已借出" width="90" align="center">
          <template #default="{ row }">
            <span :style="{ color: borrowedQty(row.id) > 0 ? 'var(--warning)' : 'inherit' }">
              {{ borrowedQty(row.id) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="存放位置" min-width="120" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag[row.status as keyof typeof statusTag]" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="保养周期" width="90" align="center">
          <template #default="{ row }">
            <span v-if="row.maintenanceCycleDays">{{ row.maintenanceCycleDays }} 天</span>
            <span v-else class="muted">未安排</span>
          </template>
        </el-table-column>
        <el-table-column label="上次保养" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.lastMaintenanceAt">{{ formatDate(row.lastMaintenanceAt) }}</span>
            <span v-else class="muted">从未保养</span>
          </template>
        </el-table-column>
        <el-table-column label="保养状态 / 下次" min-width="160">
          <template #default="{ row }">
            <template v-if="maintenanceTag(maintenanceStatus(row))">
              <el-tag
                :type="maintenanceTag(maintenanceStatus(row))!.tag"
                size="small"
                :effect="maintenanceStatus(row) === 'overdue' ? 'dark' : 'light'"
              >
                {{ maintenanceTag(maintenanceStatus(row))!.label }}
              </el-tag>
              <div
                class="maintenance-sub"
                :class="{ 'text-danger': maintenanceStatus(row) === 'overdue' }"
              >
                {{ nextDateText(row) }} · {{ daysText(row) }}
              </div>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.maintenanceCycleDays"
              size="small"
              :type="maintenanceStatus(row) === 'overdue' || maintenanceStatus(row) === 'due' ? 'warning' : 'default'"
              @click="completeMaintenance(row)"
            >
              完成保养
            </el-button>
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" text @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <ToolFormDialog v-model="dialogVisible" :tool="editingTool" />
    <BorrowFormDialog v-model="borrowVisible" />
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.maintenance-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.maintenance-sub.text-danger {
  color: var(--danger);
  font-weight: 600;
}
/* 逾期未保养的工具整行淡红底，一眼识别 */
:deep(.maintenance-overdue-row) {
  background-color: #fef0f0;
}
:deep(.maintenance-overdue-row:hover > td.el-table__cell) {
  background-color: #fde2e2;
}
</style>

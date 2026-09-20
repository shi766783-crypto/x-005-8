<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Tool, ToolMaintenanceInfo } from '../types'
import { TOOL_CATEGORIES, TOOL_STATUSES } from '../types'
import { useToolStore } from '../stores/useToolStore'
import { useBorrowStore } from '../stores/useBorrowStore'
import { getMaintenanceInfo } from '../utils/format'
import ToolFormDialog from '../components/ToolFormDialog.vue'
import BorrowFormDialog from '../components/BorrowFormDialog.vue'

const toolStore = useToolStore()
const borrowStore = useBorrowStore()

const dialogVisible = ref(false)
const editingTool = ref<Tool | null>(null)
const borrowVisible = ref(false)

const filterCategory = ref('')
const filterStatus = ref('')
const filterMaintenance = ref('')
const keyword = ref('')

const filtered = computed(() =>
  toolStore.tools.value.filter((t) => {
    const matchCategory = !filterCategory.value || t.category === filterCategory.value
    const matchStatus = !filterStatus.value || t.status === filterStatus.value
    const maintenanceInfo = getMaintenanceInfo(t)
    const matchMaintenance =
      !filterMaintenance.value ||
      (filterMaintenance.value === '未安排' ? !maintenanceInfo : maintenanceInfo?.dueStatus === filterMaintenance.value)
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

function borrowedQty(toolId: string): number {
  return borrowStore.borrowedByTool.value[toolId] ?? 0
}

const statusTag = { 完好: 'success', 需维修: 'danger', 已借出: 'warning' } as const
const maintenanceTag = {
  待保养: 'warning',
  今日到期: 'primary',
  即将到期: 'warning',
  正常: 'success',
  已逾期: 'danger',
} as const
const maintenanceFilters = ['已逾期', '今日到期', '待保养', '即将到期', '正常', '未安排']

function maintenance(tool: Tool): ToolMaintenanceInfo | null {
  return getMaintenanceInfo(tool)
}

async function completeMaintenance(tool: Tool) {
  await ElMessageBox.confirm(`确定已完成工具「${tool.name}」的保养吗？`, '完成保养', { type: 'info' })
  toolStore.completeMaintenance(tool.id)
  ElMessage.success('保养已完成，上次保养时间已更新')
}

function maintenanceRowClass({ row }: { row: Tool }): string {
  return getMaintenanceInfo(row)?.dueStatus === '已逾期' ? 'maintenance-overdue-row' : ''
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
      <el-select v-model="filterMaintenance" placeholder="全部保养状态" clearable style="width: 160px">
        <el-option v-for="s in maintenanceFilters" :key="s" :label="s" :value="s" />
      </el-select>
      <span class="muted">共 {{ toolStore.tools.value.length }} 件工具，合计 {{ toolStore.totalQuantity.value }} 件</span>
    </div>

    <div class="card">
      <el-table :data="filtered" border :row-class-name="maintenanceRowClass">
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
        <el-table-column label="保养周期" width="95" align="center">
          <template #default="{ row }">
            <span v-if="row.maintenanceIntervalDays">{{ row.maintenanceIntervalDays }} 天</span>
            <span v-else class="muted">未安排</span>
          </template>
        </el-table-column>
        <el-table-column label="上次保养" width="115" align="center">
          <template #default="{ row }">{{ row.lastMaintainedDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="计划保养" width="210">
          <template #default="{ row }">
            <div v-if="maintenance(row)" class="maintenance-cell">
              <div class="maintenance-line">
                <el-tag
                  :type="maintenanceTag[maintenance(row)!.dueStatus]"
                  size="small"
                >{{ maintenance(row)!.dueStatus }}</el-tag>
                <span :class="{ 'gap-missing': maintenance(row)!.dueStatus === '已逾期' }">
                  {{ maintenance(row)!.dueDate }}
                </span>
              </div>
              <div v-if="maintenance(row)!.dueStatus === '已逾期'" class="gap-missing overdue-text">
                已逾期 {{ Math.abs(maintenance(row)!.daysUntilDue) }} 天
              </div>
            </div>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="success"
              text
              :disabled="!row.maintenanceIntervalDays"
              @click="completeMaintenance(row)"
            >保养</el-button>
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
.maintenance-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.maintenance-line {
  display: flex;
  align-items: center;
  gap: 6px;
}
.overdue-text {
  font-size: 12px;
}
:deep(.maintenance-overdue-row) {
  background: #fef0f0 !important;
}
:deep(.maintenance-overdue-row:hover > td) {
  background: #fde2e2 !important;
}
</style>

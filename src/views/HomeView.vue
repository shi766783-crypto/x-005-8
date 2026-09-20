<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDashboard } from '../composables/useDashboard'
import { useToolStore } from '../stores/useToolStore'
import { useBorrowStore } from '../stores/useBorrowStore'
import StatCard from '../components/StatCard.vue'
import { today, isOverdue, formatDate } from '../utils/format'

const router = useRouter()
const { stats, unreturnedBorrows, lowStockMaterials, dueMaintenance } = useDashboard()
const toolStore = useToolStore()
const borrowStore = useBorrowStore()

function toolName(id: string): string {
  return toolStore.getTool(id)?.name ?? '未知工具'
}

function goReturn(recordId: string) {
  borrowStore.returnTool(recordId, today())
}

function completeMaintenance(toolId: string) {
  toolStore.recordMaintenance(toolId)
  ElMessage.success('保养记录已更新，下次保养时间已顺延')
}

/** 到期提示文案：逾期 N 天 / 今天到期 */
function dueText(daysLeft: number): string {
  return daysLeft < 0 ? `已逾期 ${-daysLeft} 天` : '今天到期'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">首页概览</h2>
    </div>

    <div class="stat-grid">
      <StatCard label="工具总数" :value="stats.toolTotal" color="#409eff" icon="Suitcase" />
      <StatCard label="材料种类" :value="stats.materialKinds" color="#67c23a" icon="Box" />
      <StatCard label="进行中项目" :value="stats.inProgress" color="#e6a23c" icon="Loading" />
      <StatCard label="本月完成项目" :value="stats.completedThisMonth" color="#9c27b0" icon="Medal" />
      <StatCard label="库存预警" :value="stats.lowStock" color="#f56c6c" icon="Warning" />
      <StatCard
        label="待保养工具"
        :value="stats.maintenanceDue"
        :color="toolStore.overdueMaintenanceCount.value ? '#f56c6c' : '#e6a23c'"
        icon="AlarmClock"
      />
    </div>

    <section class="card maintenance-card">
      <div class="section-head">
        <span class="section-title">
          工具保养提醒
          <el-tooltip content="按保养周期计算：从未保养过的工具从入库日起算，其余从上次保养日起算" placement="top">
            <el-icon class="help-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </span>
        <el-tag v-if="toolStore.overdueMaintenanceCount.value" type="danger" effect="dark">
          {{ toolStore.overdueMaintenanceCount.value }} 件已逾期
        </el-tag>
        <el-tag v-else-if="dueMaintenance.length" type="warning">{{ dueMaintenance.length }} 件今日到期</el-tag>
        <el-tag v-else type="success">暂无到期保养</el-tag>
      </div>
      <el-table
        v-if="dueMaintenance.length"
        :data="dueMaintenance"
        size="small"
        :row-class-name="(p: { row: { status: string } }) => (p.row.status === 'overdue' ? 'overdue-row' : '')"
      >
        <el-table-column label="工具" min-width="120">
          <template #default="{ row }">{{ row.tool.name }}</template>
        </el-table-column>
        <el-table-column label="周期" width="90" align="center">
          <template #default="{ row }">{{ row.tool.maintenanceCycleDays }} 天</template>
        </el-table-column>
        <el-table-column label="上次保养" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.tool.lastMaintenanceAt">{{ formatDate(row.tool.lastMaintenanceAt) }}</span>
            <span v-else class="muted">从未保养</span>
          </template>
        </el-table-column>
        <el-table-column label="应保养日期" width="130" align="center">
          <template #default="{ row }">
            <span :class="{ 'gap-missing': row.status === 'overdue' }">{{ formatDate(row.nextAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'overdue' ? 'danger' : 'warning'" size="small" effect="dark">
              {{ dueText(row.daysLeft) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" text @click="completeMaintenance(row.tool.id)">
              完成保养
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="所有工具都在保养周期内" :image-size="60" />
    </section>

    <div class="two-col">
      <section class="card">
        <div class="section-head">
          <span class="section-title">未归还工具提醒</span>
          <el-tag v-if="unreturnedBorrows.length" type="danger">{{ unreturnedBorrows.length }} 件未归还</el-tag>
          <el-tag v-else type="success">全部已归还</el-tag>
        </div>
        <el-table v-if="unreturnedBorrows.length" :data="unreturnedBorrows" size="small">
          <el-table-column label="工具" min-width="100">
            <template #default="{ row }">{{ toolName(row.toolId) }}</template>
          </el-table-column>
          <el-table-column prop="borrower" label="借用人" min-width="80" />
          <el-table-column label="预计归还" width="110">
            <template #default="{ row }">
              <span :style="{ color: isOverdue(row.expectedReturnDate) ? 'var(--danger)' : 'inherit' }">
                {{ row.expectedReturnDate }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" text @click="goReturn(row.id)">归还</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无未归还工具" :image-size="60" />
      </section>

      <section class="card">
        <div class="section-head">
          <span class="section-title">库存预警</span>
          <el-tag v-if="lowStockMaterials.length" type="warning">{{ lowStockMaterials.length }} 种需补货</el-tag>
          <el-tag v-else type="success">库存充足</el-tag>
        </div>
        <el-table v-if="lowStockMaterials.length" :data="lowStockMaterials" size="small">
          <el-table-column prop="name" label="材料" min-width="100" />
          <el-table-column label="当前库存" width="110" align="center">
            <template #default="{ row }">
              <span class="gap-missing">{{ row.quantity }} {{ row.unit }}</span>
            </template>
          </el-table-column>
          <el-table-column label="预警值" width="90" align="center">
            <template #default="{ row }">{{ row.minStock }} {{ row.unit }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无预警材料" :image-size="60" />
      </section>
    </div>

    <section class="card quick-actions">
      <span class="section-title">快速入口</span>
      <div class="quick-btns">
        <el-button type="primary" @click="router.push({ name: 'tools' })">
          <el-icon><Suitcase /></el-icon>&nbsp;管理工具
        </el-button>
        <el-button type="success" @click="router.push({ name: 'materials' })">
          <el-icon><Box /></el-icon>&nbsp;管理材料
        </el-button>
        <el-button type="warning" @click="router.push({ name: 'projects' })">
          <el-icon><Notebook /></el-icon>&nbsp;创建项目
        </el-button>
        <el-button @click="router.push({ name: 'dashboard' })">
          <el-icon><DataAnalysis /></el-icon>&nbsp;查看看板
        </el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.maintenance-card {
  margin-bottom: 16px;
}
.help-icon {
  color: var(--text-secondary);
  vertical-align: -2px;
  cursor: help;
}
:deep(.overdue-row) {
  background-color: #fef0f0;
}
:deep(.overdue-row:hover > td.el-table__cell) {
  background-color: #fde2e2;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
}
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>

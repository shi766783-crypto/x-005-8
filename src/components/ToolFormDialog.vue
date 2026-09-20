<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Tool, ToolCategory, ToolStatus } from '../types'
import { TOOL_CATEGORIES, TOOL_STATUSES, MAINTENANCE_CYCLE_OPTIONS } from '../types'
import { useToolStore } from '../stores/useToolStore'
import { toNumber, formatDate, parseDate } from '../utils/format'
import ImageUpload from './ImageUpload.vue'

const props = defineProps<{ modelValue: boolean; tool: Tool | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>()

const store = useToolStore()
const formRef = ref<FormInstance>()

const emptyForm = {
  name: '',
  category: '手动工具' as ToolCategory,
  quantity: 1,
  location: '',
  status: '完好' as ToolStatus,
  photo: '',
  maintenanceCycleDays: undefined as number | undefined,
  lastMaintenanceDate: '' as string,
}

const form = reactive({ ...emptyForm })

const rules: FormRules = {
  name: [{ required: true, message: '请输入工具名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (props.tool) {
        Object.assign(form, {
          ...emptyForm,
          ...props.tool,
          photo: props.tool.photo ?? '',
          maintenanceCycleDays: toNumber(props.tool.maintenanceCycleDays) || undefined,
          lastMaintenanceDate: props.tool.lastMaintenanceAt ? formatDate(props.tool.lastMaintenanceAt) : '',
        })
      } else {
        Object.assign(form, emptyForm)
      }
    }
  },
)

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const payload = {
    ...form,
    quantity: toNumber(form.quantity),
    // 周期为空表示不安排保养；未选周期时上次保养时间无意义，一并清空
    maintenanceCycleDays: form.maintenanceCycleDays ?? 0,
    lastMaintenanceAt: form.maintenanceCycleDays && form.lastMaintenanceDate
      ? parseDate(form.lastMaintenanceDate)
      : undefined,
  }
  if (props.tool) store.updateTool(props.tool.id, payload)
  else store.addTool(payload)
  ElMessage.success(props.tool ? '工具已更新' : '工具已添加')
  emit('saved')
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="tool ? '编辑工具' : '添加工具'"
    width="520px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="如：十字螺丝刀" />
      </el-form-item>
      <el-form-item label="类别" prop="category">
        <el-select v-model="form.category" style="width: 100%">
          <el-option v-for="c in TOOL_CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="form.quantity" :min="0" />
      </el-form-item>
      <el-form-item label="存放位置">
        <el-input v-model="form.location" placeholder="如：车库工具柜" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio-button v-for="s in TOOL_STATUSES" :key="s" :value="s">{{ s }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="保养周期">
        <el-select
          v-model="form.maintenanceCycleDays"
          placeholder="不安排定期保养"
          clearable
          style="width: 220px"
        >
          <el-option
            v-for="days in MAINTENANCE_CYCLE_OPTIONS"
            :key="days"
            :label="`每 ${days} 天`"
            :value="days"
          />
        </el-select>
        <span class="muted form-hint">留空则不安排保养；从未保养过的工具从入库日起算</span>
      </el-form-item>
      <el-form-item v-if="form.maintenanceCycleDays" label="上次保养">
        <el-date-picker
          v-model="form.lastMaintenanceDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择上次保养日期（可留空）"
          style="width: 220px"
        />
      </el-form-item>
      <el-form-item label="照片">
        <ImageUpload v-model="form.photo" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-hint {
  margin-left: 10px;
  font-size: 12px;
}
</style>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Tool, ToolCategory, ToolStatus } from '../types'
import { TOOL_CATEGORIES, TOOL_STATUSES } from '../types'
import { useToolStore } from '../stores/useToolStore'
import { toNumber, today } from '../utils/format'
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
  maintenanceIntervalDays: undefined as number | undefined,
  lastMaintainedDate: '',
  photo: '',
}

const form = reactive({ ...emptyForm })

const disabledFutureDate = (date: Date) => date.getTime() > new Date(`${today()} 23:59:59`).getTime()

const rules: FormRules = {
  name: [{ required: true, message: '请输入工具名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  lastMaintainedDate: [
    {
      validator: (_rule, value: string, callback) => {
        if (value && !form.maintenanceIntervalDays) callback(new Error('请先设置保养周期'))
        else callback()
      },
      trigger: 'change',
    },
  ],
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      Object.assign(form, {
        ...emptyForm,
        ...(props.tool
          ? {
              ...props.tool,
              maintenanceIntervalDays: props.tool.maintenanceIntervalDays ?? undefined,
              lastMaintainedDate: props.tool.lastMaintainedDate ?? '',
              photo: props.tool.photo ?? '',
            }
          : {}),
      })
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
  const maintenanceIntervalDays = form.maintenanceIntervalDays
    ? toNumber(form.maintenanceIntervalDays)
    : undefined
  const lastMaintainedDate = maintenanceIntervalDays ? form.lastMaintainedDate || undefined : undefined
  const payload = {
    ...form,
    quantity: toNumber(form.quantity),
    maintenanceIntervalDays,
    lastMaintainedDate,
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
        <el-input-number
          v-model="form.maintenanceIntervalDays"
          :min="1"
          :max="3650"
          placeholder="不设置"
        />
        <span class="form-hint">天；留空表示不安排保养</span>
      </el-form-item>
      <el-form-item v-if="form.maintenanceIntervalDays" label="上次保养" prop="lastMaintainedDate">
        <el-date-picker
          v-model="form.lastMaintainedDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择上次保养日期"
          :disabled-date="disabledFutureDate"
          style="width: 100%"
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
  color: var(--text-secondary);
  font-size: 13px;
}
</style>

import { z } from 'zod'

export interface BuildInvSetValidationResult {
  isValid: boolean
  errors: string[]
}

export const buildInvSetFormSchema = z.object({
  layout: z.string().trim().min(1, 'Layout is required'),
  trackerId: z.number().int().positive('Tracker is required'),
  buildPurpose: z.string().trim().min(1, 'Build purpose is required'),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: z.string().trim().min(1, 'End date is required'),
  buildBranch: z.string().trim().min(1, 'Build branch is required'),
  targetVersion: z.object({ id: z.number().int().positive().optional() }).optional(),
  project: z.object({ id: z.number().int().positive().optional() }).optional(),
  selectedAssignee: z.object({ id: z.number().int().positive().optional() }).optional(),
  buildSpringBoot: z.object({
    enabled: z.boolean().optional(),
    project: z.object({ id: z.number().int().positive().optional() }).optional(),
    selectedAssignee: z.object({ id: z.number().int().positive().optional() }).optional(),
  }).optional(),
  buildVB6: z.object({
    enabled: z.boolean().optional(),
    project: z.object({ id: z.number().int().positive().optional() }).optional(),
    selectedAssignee: z.object({ id: z.number().int().positive().optional() }).optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (!value.targetVersion?.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetVersion'],
      message: 'Target version is required',
    })
  }

  if (!value.project?.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['project'],
      message: '.NET: Please select a Project',
    })
  }

  if (!value.selectedAssignee?.id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selectedAssignee'],
      message: '.NET: Please select an Assignee',
    })
  }

  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'Start date cannot be greater than end date',
    })
  }

  if (value.buildSpringBoot?.enabled) {
    if (!value.buildSpringBoot.project?.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['buildSpringBoot.project'],
        message: 'Gateway: Please select a Project',
      })
    }

    if (!value.buildSpringBoot.selectedAssignee?.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['buildSpringBoot.selectedAssignee'],
        message: 'Gateway: Please select an Assignee',
      })
    }
  }

  if (value.buildVB6?.enabled) {
    if (!value.buildVB6.project?.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['buildVB6.project'],
        message: 'VB6: Please select a Project',
      })
    }

    if (!value.buildVB6.selectedAssignee?.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['buildVB6.selectedAssignee'],
        message: 'VB6: Please select an Assignee',
      })
    }
  }
})

export const validateBuildInvSetForm = (formState: any, accessKey: string | null): BuildInvSetValidationResult => {
  const result = buildInvSetFormSchema.safeParse(formState)
  const errors = result.success
    ? []
    : result.error.issues.map((issue) => issue.message)

  if (!accessKey?.trim()) {
    errors.push('Access key is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

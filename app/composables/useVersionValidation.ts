import { z } from 'zod'

export const versionFormSchema = z.object({
  name: z.string().trim().min(1, 'Version name is required'),
  description: z.string().trim().min(1, 'Description is required'),
  due_date: z.string().trim().min(1, 'Due date is required'),
  status: z.string().trim().min(1, 'Status is required'),
  sharing: z.string().trim().min(1, 'Sharing is required'),
  projectid: z.number().gt(0, 'Project is required')
})

export type VersionFormSchema = z.infer<typeof versionFormSchema>

export const useVersionValidation = () => {
  return {
    versionFormSchema
  }
}

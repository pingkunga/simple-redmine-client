import { describe, it, expect } from 'vitest'
import { versionFormSchema } from './useVersionValidation'

describe('useVersionValidation', () => {
  it('should validate a correct version form', () => {
    const validData = {
      name: 'v1.0.0',
      description: 'First release',
      due_date: '2026-12-31',
      status: 'open',
      sharing: 'none',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should fail when name is empty', () => {
    const invalidData = {
      name: '',
      description: 'First release',
      due_date: '2026-12-31',
      status: 'open',
      sharing: 'none',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Version name is required')
    }
  })

  it('should fail when description is empty', () => {
    const invalidData = {
      name: 'v1.0.0',
      description: '',
      due_date: '2026-12-31',
      status: 'open',
      sharing: 'none',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Description is required')
    }
  })

  it('should fail when due_date is empty', () => {
    const invalidData = {
      name: 'v1.0.0',
      description: 'First release',
      due_date: '',
      status: 'open',
      sharing: 'none',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Due date is required')
    }
  })

  it('should fail when status is empty', () => {
    const invalidData = {
      name: 'v1.0.0',
      description: 'First release',
      due_date: '2026-12-31',
      status: '',
      sharing: 'none',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Status is required')
    }
  })

  it('should fail when sharing is empty', () => {
    const invalidData = {
      name: 'v1.0.0',
      description: 'First release',
      due_date: '2026-12-31',
      status: 'open',
      sharing: '',
      projectid: 123
    }
    const result = versionFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Sharing is required')
    }
  })

  it('should fail when projectid is 0 or less', () => {
    const invalidData1 = {
      name: 'v1.0.0',
      description: 'First release',
      due_date: '2026-12-31',
      status: 'open',
      sharing: 'none',
      projectid: 0
    }
    const result1 = versionFormSchema.safeParse(invalidData1)
    expect(result1.success).toBe(false)
    if (!result1.success) {
      expect(result1.error.issues[0].message).toBe('Project is required')
    }

    const invalidData2 = { ...invalidData1, projectid: -1 }
    const result2 = versionFormSchema.safeParse(invalidData2)
    expect(result2.success).toBe(false)
    if (!result2.success) {
      expect(result2.error.issues[0].message).toBe('Project is required')
    }
  })
})

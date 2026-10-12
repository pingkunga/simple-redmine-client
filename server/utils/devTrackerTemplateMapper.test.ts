import { describe, expect, it } from 'vitest'
import { renderDevTrackerPayload, replaceAllJson } from './devTrackerTemplateMapper'

const baseReplacements = {
    '[BNZPROJECTID]': '1',
    '[BNZTRACKERID]': '11',
    '[BNZASSIGNEDTOID]': '99',
    '[BNZFIXEDVERSIONID]': '10',
    '[BNZSUBJECT]': '[SITENAME][MODULE][IMPACT] Test subject',
    '[BNZDESCRIPTION]': 'line one\nline two "quoted"',
    '[BNZSTARTDATE]': '2026-07-25',
    '[BNZDUEDATE]': '2026-07-25',
    '[BNZIMPACTNOTE]': 'Impact Note\n- รบกวนสอบถาม Tester',
}

describe('devTrackerTemplateMapper', () => {
    it('renders TemplateReq_ProgramSpec.json into a valid Redmine issue payload', async () => {
        const payload = await renderDevTrackerPayload('TemplateReq_ProgramSpec.json', baseReplacements)

        expect(payload.issue.project_id).toBe(1)
        expect(typeof payload.issue.project_id).toBe('number')
        expect(payload.issue.tracker_id).toBe(11)
        expect(payload.issue.assigned_to_id).toBe(99)
        expect(payload.issue.fixed_version_id).toBe(10)
        expect(payload.issue.status_id).toBe(16)
        expect(payload.issue.priority_id).toBe(4)
        expect(payload.issue.subject).toBe('[SITENAME][MODULE][IMPACT] Test subject')
        expect(payload.issue.description).toBe('line one\nline two "quoted"')
        expect(payload.issue.custom_fields).toEqual([
            { id: 4, value: 'Implementation' },
            { id: 34, value: 'Production' },
            { id: 44, value: 'Impact Note\n- รบกวนสอบถาม Tester' },
        ])
    })

    it('renders TemplateReq_Defect.json into a valid Redmine issue payload', async () => {
        const payload = await renderDevTrackerPayload('TemplateReq_Defect.json', baseReplacements)

        expect(payload.issue.status_id).toBe(1)
        expect(payload.issue.priority_id).toBe(3)
        expect(payload.issue.custom_fields).toEqual([
            { id: 18, value: 'Major' },
            { id: 14, value: 'Development' },
            { id: 13, value: 'Testing' },
            { id: 44, value: 'Impact Note\n- รบกวนสอบถาม Tester' },
        ])
    })

    it('renders TemplateReq_ChangeRequest.json into a valid Redmine issue payload', async () => {
        const payload = await renderDevTrackerPayload('TemplateReq_ChangeRequest.json', baseReplacements)

        expect(payload.issue.status_id).toBe(7)
        expect(payload.issue.priority_id).toBe(3)
        expect(payload.issue.custom_fields).toEqual([
            { id: 52, value: 'Upgrade' },
            { id: 14, value: 'Production' },
            { id: 13, value: 'Production' },
            { id: 38, value: 'Impact Note\n- รบกวนสอบถาม Tester' },
        ])
    })

    it('renders TemplateReq_Feature.json into a valid Redmine issue payload', async () => {
        const payload = await renderDevTrackerPayload('TemplateReq_Feature.json', {
            ...baseReplacements,
            '[BNZTRACKERID]': '14',
        })

        expect(payload.issue.project_id).toBe(1)
        expect(payload.issue.tracker_id).toBe(14)
        expect(payload.issue.status_id).toBe(1)
        expect(payload.issue.priority_id).toBe(3)
        expect(payload.issue.assigned_to_id).toBe(99)
        expect(payload.issue.fixed_version_id).toBe(10)
        expect(payload.issue.custom_fields).toEqual([
            { id: 39, value: 'Work' },
            { id: 41, value: '' },
            { id: 51, value: '' },
            { id: 26, value: '' },
            { id: 18, value: '' },
            { id: 97, value: '' },
            { id: 44, value: 'Impact Note\n- รบกวนสอบถาม Tester' },
            { id: 5, value: '' },
            { id: 115, value: '' },
            { id: 116, value: '' },
            { id: 112, value: '' },
            { id: 113, value: '' },
            { id: 114, value: '' },
        ])
    })

    it('escapes quotes and newlines in string replacements so the JSON stays valid', () => {
        const output = replaceAllJson('{"description": "[BNZDESCRIPTION]"}', {
            '[BNZDESCRIPTION]': 'has "quotes"\nand newlines',
        })

        expect(() => JSON.parse(output)).not.toThrow()
        expect(JSON.parse(output).description).toBe('has "quotes"\nand newlines')
    })

    it('replaces an empty numeric id placeholder with null', () => {
        const output = replaceAllJson('{"assigned_to_id": [BNZASSIGNEDTOID], "subject": [BNZSUBJECT]}', {
            '[BNZASSIGNEDTOID]': '',
            '[BNZSUBJECT]': '',
        })

        const parsed = JSON.parse(output)
        expect(parsed.assigned_to_id).toBeNull()
        expect(parsed.subject).toBe('')
    })
})

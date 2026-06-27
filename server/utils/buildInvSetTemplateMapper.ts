import fs from 'fs'
import path from 'path'
import type { BuildInvSetRequest } from '~~/shared/types/BuildInvSet'

export const buildToggleMarker = (value: boolean) => (value ? '/' : '')

const normalizeValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return ''

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^-?\d+$/.test(trimmed)) {
      return trimmed
    }
  }

  return String(value)
}

const replaceAll = (text: string, replacements: Record<string, string>) => {
  let output = text
  Object.entries(replacements).forEach(([key, value]) => {
    output = output.split(key).join(value ?? '')
  })
  return output
}

const replaceAllJson = (text: string, replacements: Record<string, string>) => {
  let output = text
  Object.entries(replacements).forEach(([key, value]) => {
    const rawValue = value ?? ''
    const isNumericPlaceholder = /\[(?:BNZPROJECTID|BNZTRACKERID|BNZASSIGNEDTOID|BNZTARGETID|BNZPARENTID)\]/.test(key)

    if (rawValue === '') {
      output = output.split(key).join(isNumericPlaceholder ? 'null' : '""')
      return
    }

    const escapedValue = /^-?\d+$/.test(rawValue) ? rawValue : JSON.stringify(rawValue).slice(1, -1)
    output = output.split(key).join(escapedValue)
  })
  return output
}

const readTemplateText = async (fileName: string) => {
  const filePath = path.join(process.cwd(), 'public', 'IssueTemplate', 'buildinvset', 'Default', fileName)
  return fs.promises.readFile(filePath, 'utf-8')
}

const buildCommonReplacements = (request: BuildInvSetRequest, projectId?: number, assigneeId?: number) => ({
  '[BNZPROJECTID]': normalizeValue(projectId ?? request.project?.id ?? ''),
  '[BNZTRACKERID]': normalizeValue(request.tracker ?? ''),
  '[BNZASSIGNEDTOID]': normalizeValue(assigneeId ?? request.selectedAssignee?.id ?? ''),
  '[BNZTARGETID]': normalizeValue(request.targetVersion?.id ?? ''),
  '[BNZTARGETVERSION]': request.targetVersion?.name ?? '',
  '[BNZSTARTDATE]': request.startDate ?? '',
  '[BNZENDDATE]': request.endDate ?? '',
  '[BNZBUILDBRANCHNAME]': request.buildBranch ?? '',
  '[BNZBUILDPURPOSE]': request.buildPurpose ?? '',
  '[BNZLAYOUT]': request.layout ?? '',
  '[BNZPROJECTNAME]': request.project?.name ?? '',
  '[BNZPARENTID]': '',
  '[BNZBUILDNETDESCRIPTION]': '',
  '[BNZBUILDSPRINGDESCRIPTION]': '',
  '[BNZBUILDVB6DESCRIPTION]': '',
})

const buildDotnetReplacements = (request: BuildInvSetRequest) => {
  const dotnet = request.buildDOTNET
  const win = dotnet.buildInvSetDOTNETCoreWindows
  const tsy = dotnet.buildInvSetDOTNETCustomContainerTSY
  const coreContainer = dotnet.buildInvSetDOTNETCoreContainer

  return {
    ...buildCommonReplacements(request, request.project?.id, request.selectedAssignee?.id),
    '[BNZBUILDNETWIN]': buildToggleMarker(win.buildInv),
    '[BNZBUILDNETWIN_PURPOSE]': request.buildPurpose ?? '',
    '[BNZBUILDNETWIN_MODE]': win.mode ?? '',
    '[BNZBUILDNETWIN_BUILDFRONT]': buildToggleMarker(win.buildFront),
    '[BNZBUILDNETWIN_OFFICEADDINS]': buildToggleMarker(win.officeAddins),
    '[BNZBUILDNETWIN_AUTOUPDATE]': buildToggleMarker(win.autoUpdate),
    '[BNZBUILDNETWIN_GENSBOM]': buildToggleMarker(win.genSbom),
    '[BNZBUILDNETWIN_KEEPPACKAGE]': buildToggleMarker(win.keepPackage),
    '[BNZBUILDNETWIN_ZIPPACKAGE]': buildToggleMarker(win.zipKeepPackage),
    '[BNZBUILDNETWIN_SENDNOTIFY]': buildToggleMarker(win.sendNotify),
    '[BNZBUILDNETWIN_CLEARWORKSPACE]': buildToggleMarker(win.cleanupWs),
    '[BNZBUILDNETWIN_SUBMODULECHECK]': buildToggleMarker(win.submoduleCheck),

    '[BNZBUILDNET_CONTAINERTSY]': buildToggleMarker(tsy.containerBuildTsy),
    '[BNZBUILDNET_CONTAINERTSY_BUILDBACK]': buildToggleMarker(tsy.containerBuildBackTsy),
    '[BNZBUILDNET_CONTAINERTSY_BUILDFRONT]': buildToggleMarker(tsy.containerBuildFrontTsy),
    '[BNZBUILDNET_CONTAINERTSY_TARGETOS]': tsy.targetOsTsy ?? '',
    '[BNZBUILDNET_CONTAINERTSY_DEPLOYSCM]': buildToggleMarker(tsy.deployScmTsy),
    '[BNZBUILDNET_CONTAINERTSY_DEPLOYNEXUS]': buildToggleMarker(tsy.deployNexusTsy),
    '[BNZBUILDNET_CONTAINERTSY_DOCKERFILE]': tsy.dockerFileTsy ?? '',
    '[BNZBUILDNET_CONTAINERTSY_CLEANUP]': buildToggleMarker(tsy.cleanupTsy),
    '[BNZBUILDNET_CONTAINERTSY_SUBMODULECHECK]': buildToggleMarker(tsy.submoduleCheckTsy),

    '[BNZBUILDNET_CONTAINERCORE]': buildToggleMarker(coreContainer.containerBuildInv),
    '[BNZBUILDNET_CONTAINERCORE_BUILDBACK]': buildToggleMarker(coreContainer.containerBuildBackInv),
    '[BNZBUILDNET_CONTAINERCORE_BUILDFRONT]': buildToggleMarker(coreContainer.containerBuildFrontInv),
    '[BNZBUILDNET_CONTAINERCORE_TARGETOS]': coreContainer.targetOsInv ?? '',
    '[BNZBUILDNET_CONTAINERCORE_DEPLOYSCM]': buildToggleMarker(coreContainer.deployScmInv),
    '[BNZBUILDNET_CONTAINERCORE_DEPLOYNEXUS]': buildToggleMarker(coreContainer.deployNexusInv),
    '[BNZBUILDNET_CONTAINERCORE_DOCKERFILE]': coreContainer.dockerFileInv ?? '',
    '[BNZBUILDNET_CONTAINERCORE_CLEANUP]': buildToggleMarker(coreContainer.cleanupInv),
    '[BNZBUILDNET_CONTAINERCORE_SUBMODULECHECK]': buildToggleMarker(coreContainer.submoduleCheckInv),
  }
}

const buildSpringReplacements = (request: BuildInvSetRequest) => {
  const spring = request.buildSpringBoot
  const core = spring.buildInvSetGatewayCore
  const tsy = spring.buildInvSetGatewayCustomTSY

  return {
    ...buildCommonReplacements(request, spring.project?.id, spring.selectedAssignee?.id),
    '[BNZBUILDSPRING_CORE]': buildToggleMarker(core.build),
    '[BNZBUILDSPRING_CORE_BUILDFRONT]': buildToggleMarker(core.buildFront),
    '[BNZBUILDSPRING_CORE_BUILDCONTAINER]': buildToggleMarker(core.buildContainer),
    '[BNZBUILDSPRING_CORE_DEPLOYSCM]': buildToggleMarker(core.deployScm),
    '[BNZBUILDSPRING_CORE_DEPLOYNEXUS]': buildToggleMarker(core.deployNexus),
    '[BNZBUILDSPRING_CORE_UNITTEST]': buildToggleMarker(core.unitTest),
    '[BNZBUILDSPRING_CORE_EXECUTESONAR]': buildToggleMarker(core.sonar),
    '[BNZBUILDSPRING_CORE_CLEANUP]': buildToggleMarker(core.cleanup),

    '[BNZBUILDSPRING_TSY]': buildToggleMarker(tsy.build),
    '[BNZBUILDSPRING_TSY_BUILDFRONT]': buildToggleMarker(tsy.buildFront),
    '[BNZBUILDSPRING_TSY_BUILDCONTAINER]': buildToggleMarker(tsy.buildContainer),
    '[BNZBUILDSPRING_TSY_DEPLOYSCM]': buildToggleMarker(tsy.deployScm),
    '[BNZBUILDSPRING_TSY_DEPLOYNEXUS]': buildToggleMarker(tsy.deployNexus),
    '[BNZBUILDSPRING_TSY_UNITTEST]': buildToggleMarker(tsy.unitTest),
    '[BNZBUILDSPRING_TSY_EXECUTESONAR]': buildToggleMarker(tsy.sonar),
    '[BNZBUILDSPRING_TSY_CLEANUP]': buildToggleMarker(tsy.cleanup),
  }
}

const buildVb6Replacements = (request: BuildInvSetRequest) => ({
  ...buildCommonReplacements(request, request.buildVB6.project?.id, request.buildVB6.selectedAssignee?.id),
  '[BNZBUILDVB6]': buildToggleMarker(request.buildVB6.build),
})

export const renderBuildInvSetTemplate = async (
  request: BuildInvSetRequest,
  templateFileName: string,
  jsonTemplateFileName: string,
  descriptionToken: string,
  replacements: Record<string, string>,
) => {
  const descriptionTemplate = await readTemplateText(templateFileName)
  const description = replaceAll(descriptionTemplate, replacements)

  const jsonTemplate = await readTemplateText(jsonTemplateFileName)
  const payload = JSON.parse(replaceAllJson(jsonTemplate, {
    ...replacements,
    [descriptionToken]: description,
  }))

  return {
    description,
    payload,
  }
}

export const buildBuildInvSetPayloads = async (request: BuildInvSetRequest) => {
  const results: Array<{ type: string; payload: unknown }> = []

  if (request.buildDOTNET?.enabled) {
    const replacements = buildDotnetReplacements(request)
    const rendered = await renderBuildInvSetTemplate(
      request,
      'BuildInvsNETTemplate_Default.textile',
      'TemplateReq_NET.json',
      '[BNZBUILDNETDESCRIPTION]',
      replacements,
    )
    results.push({ type: 'dotnet', payload: rendered.payload })
  }

  if (request.buildVB6?.enabled) {
    const replacements = buildVb6Replacements(request)
    const rendered = await renderBuildInvSetTemplate(
      request,
      'BuildInvsVB6Template_Default.textile',
      'TemplateReq_VB6.json',
      '[BNZBUILDVB6DESCRIPTION]',
      replacements,
    )
    results.push({ type: 'vb6', payload: rendered.payload })
  }

  if (request.buildSpringBoot?.enabled) {
    const replacements = buildSpringReplacements(request)
    const rendered = await renderBuildInvSetTemplate(
      request,
      'BuildInvsSpringTemplate_Default.textile',
      'TemplateReq_Spring.json',
      '[BNZBUILDSPRINGDESCRIPTION]',
      replacements,
    )
    results.push({ type: 'spring', payload: rendered.payload })
  }

  return results
}

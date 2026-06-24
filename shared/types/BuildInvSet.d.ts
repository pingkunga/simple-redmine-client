export interface BuildInvSetDOTNET {
  enabled: boolean

  buildInvSetDOTNETCoreWindows: BuildInvSetDOTNETCoreWindowsOptions
  buildInvSetDOTNETCoreContainer: BuildInvSetDOTNETCoreContainerOptions
  buildInvSetDOTNETCustomContainerTSY: BuildInvSetDOTNETCustomContainerTSYOptions
}

export interface BuildInvSetDOTNETCoreWindowsOptions {
  buildInv: boolean
  mode: string
  buildFront: boolean
  officeAddins: boolean
  autoUpdate: boolean
  genSbom: boolean
  keepPackage: boolean
  zipKeepPackage: boolean
  sendNotify: boolean
  cleanupWs: boolean
  submoduleCheck: boolean
}

export interface BuildInvSetDOTNETCoreContainerOptions {
  containerBuildInv: boolean
  containerBuildBackInv: boolean
  containerBuildFrontInv: boolean
  targetOsInv: string
  deployScmInv: boolean
  deployNexusInv: boolean
  cleanupInv: boolean
  submoduleCheckInv: boolean
  dockerFileInv: string
}

export interface BuildInvSetDOTNETCustomContainerTSYOptions {
  containerBuildTsy: boolean
  containerBuildBackTsy: boolean
  containerBuildFrontTsy: boolean
  targetOsTsy: string
  deployScmTsy: boolean
  deployNexusTsy: boolean
  cleanupTsy: boolean
  submoduleCheckTsy: boolean
  dockerFileTsy: string
}


export interface BuildInvSetGateway {
  enabled: boolean
  buildInvSetGatewayCore: BuildInvSetGatewayCoreOptions
  buildInvSetGatewayCustomTSY: BuildInvSetGatewayCustomTSYOptions
}

export interface BuildInvSetGatewayCoreOptions {
  build: boolean
  buildFront: boolean
  buildContainer: boolean
  deployScm: boolean
  deployNexus: boolean
  unitTest: boolean
  sonar: boolean
  cleanup: boolean
}

export interface BuildInvSetGatewayCustomTSYOptions {
  build: boolean
  buildFront: boolean
  buildContainer: boolean
  deployScm: boolean
  deployNexus: boolean
  unitTest: boolean
  sonar: boolean
  cleanup: boolean
}


export interface BuildInvSetVB6{
  enabled: boolean
  build: boolean
}

import type { Project, ProjectMemberShip } from './Project'
import type { Version } from './Version'

export interface BuildInvSetRequest {
  tracker: string
  project: Project
  targetVersion: Version
  buildPurpose: string
  selectedAssignee?: ProjectMemberShip
  startDate: string
  endDate: string
  buildBranch: string
  useServerToken: boolean

  buildDOTNET: BuildInvSetDOTNET
  buildSpringBoot: BuildInvSetGateway
  buildVB6: BuildInvSetVB6
}
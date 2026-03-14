export interface Project {
  id: number;
  name: string;
}


export interface RawProject {
  id: number;
  name: string;
  identifier: string;
  description: string;
  homepage: string;
  status: number;
  is_public: boolean;
  inherit_members: boolean;
  custom_fields: CustomField[];
  created_on: string;
  updated_on: string;
}

//================================
// Project MemberShip

export interface RawMembership {
  id: number;
  project: RawMembershipProject;
  group?: RawMembershipGroup;
  roles: RawMembershipRole[];
  user?: RawMembershipUser;
}

interface RawMembershipProject {
  id: number;
  name: string;
}

interface RawMembershipGroup {
  id: number;
  name: string;
}

interface RawMembershipRole {
  id: number;
  name: string;
  inherited?: boolean;
}

interface RawMembershipUser {
  id: number;
  name: string;
}

export interface ProjectMemberShip {
  projectId: number;
  memberType: string;
  id: number;
  name: string;

  membershipid: string;
}
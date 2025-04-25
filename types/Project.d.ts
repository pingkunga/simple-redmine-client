interface Project {
  id: number;
  name: string;
}

//เดี๋ยวย้ายไปที่อื่น
interface CustomField {
  id: number;
  name: string;
  value: string | null;
}

interface RawProject {
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

interface RawMembership {
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

interface ProjectMemberShip {
  projectId: number;
  type: string;
  id: number;
  name: string;

  membershipid: string;
}
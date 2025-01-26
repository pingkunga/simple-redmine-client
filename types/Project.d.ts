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
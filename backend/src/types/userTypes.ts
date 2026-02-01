export interface NewUser {
  name: string;
  email: string;
  password: string;
  profile_pic?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  profile_pic: string | null;
  created_at: Date;
}

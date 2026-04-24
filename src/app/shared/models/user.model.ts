export interface User {
 token:    string;
  type:     string;
  id:       number;
  fullName: string;
  email:    string;
  cin:      string;
  role:     'CLIENT' | 'ADMIN';}
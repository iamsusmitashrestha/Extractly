export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  message: string;
  statusCode: number;
}

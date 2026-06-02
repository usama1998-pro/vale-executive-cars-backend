export interface JwtPayload {
  sub: string;
  email: string;
  is_admin: boolean;
  tv?: number;
  jti?: string;
  exp?: number;
  iat?: number;
}

export type AuthenticatedUser = JwtPayload & {
  expires_in: number;
  expires_at: string;
};

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  expires_at: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

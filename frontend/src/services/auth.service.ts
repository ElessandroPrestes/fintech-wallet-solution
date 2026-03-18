import { httpClient } from '@/lib/http-client';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

export const authService = {
  login(email: string, password: string): Promise<AuthResponse> {
    return httpClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  register(name: string, email: string, password: string): Promise<{ id: string; email: string }> {
    return httpClient('/users', {
      method: 'POST',
      body: { name, email, password },
    });
  },
};

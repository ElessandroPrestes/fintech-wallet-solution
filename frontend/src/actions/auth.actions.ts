'use server';

import { redirect } from 'next/navigation';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { setSession, clearSession } from '@/lib/session';
import { ApiError } from '@/lib/http-client';

export type ActionResult = { success: true } | { success: false; error: string };

export async function loginAction(formData: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { email, password } = parsed.data;
    const response = await authService.login(email, password);
    setSession(response.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { success: false, error: 'E-mail ou senha incorretos' };
    }
    return { success: false, error: 'Serviço indisponível. Tente novamente.' };
  }

  redirect('/dashboard');
}

export async function registerAction(formData: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { name, email, password } = parsed.data;
    await authService.register(name, email, password);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { success: false, error: 'E-mail já cadastrado' };
    }
    return { success: false, error: 'Serviço indisponível. Tente novamente.' };
  }

  redirect('/login?registered=true');
}

export async function logoutAction(): Promise<void> {
  clearSession();
  redirect('/login');
}

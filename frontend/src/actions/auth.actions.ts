'use server';

import { redirect } from 'next/navigation';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { setSession, clearSession } from '@/lib/session';
import { ApiError } from '@/lib/http-client';

export type ActionResult = { success: true } | { success: false; error: string };

// loginAction e registerAction são chamadas de Client Components → nunca usar redirect()
// O redirect() lança uma exceção interna do Next.js que faz o await retornar undefined no cliente
// A navegação pós-sucesso é responsabilidade do Client Component via useRouter

export async function loginAction(formData: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { email, password } = parsed.data;
    const response = await authService.login(email, password);
    setSession(response.accessToken);
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { success: false, error: 'E-mail ou senha incorretos' };
    }
    return { success: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function registerAction(formData: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { name, email, password } = parsed.data;
    await authService.register(name, email, password);
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { success: false, error: 'E-mail já cadastrado' };
    }
    return { success: false, error: 'Erro de conexão com o servidor' };
  }
}

// logoutAction é chamada via <form action> (não await de Client Component) → redirect() é seguro
export async function logoutAction(): Promise<void> {
  clearSession();
  redirect('/login');
}

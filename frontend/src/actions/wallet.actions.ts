'use server';

import { revalidatePath } from 'next/cache';
import { getSession, clearSession } from '@/lib/session';
import { walletService } from '@/services/wallet.service';
import { depositSchema, transferSchema } from '@/schemas/wallet.schema';
import { ApiError } from '@/lib/http-client';
import type { ActionResult } from '@/actions/auth.actions';

// Retorna null em vez de redirect() — wallet actions são chamadas de Client Components
function requireSession(): string | null {
  return getSession() ?? null;
}

function handleApiError(err: unknown): ActionResult {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      clearSession();
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Serviço indisponível. Tente novamente.' };
}

export async function depositAction(formData: unknown): Promise<ActionResult> {
  const session = requireSession();
  if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

  const parsed = depositSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { amount, description } = parsed.data;
    await walletService.deposit(session, amount, description);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return handleApiError(err);
  }
}

export async function transferAction(formData: unknown): Promise<ActionResult> {
  const session = requireSession();
  if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

  const parsed = transferSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { recipientId, amount, description } = parsed.data;
    await walletService.transfer(session, recipientId, amount, description);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    // Traduz erros semânticos do backend para feedback claro ao usuário
    if (err instanceof ApiError) {
      if (err.status === 400 && err.message.toLowerCase().includes('insuficiente')) {
        return { success: false, error: 'Saldo insuficiente para realizar a transferência' };
      }
      if (err.status === 404) {
        return { success: false, error: 'Conta destinatária não encontrada' };
      }
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Serviço indisponível. Tente novamente.' };
  }
}

export async function reverseAction(entryId: string): Promise<ActionResult> {
  const session = requireSession();
  if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

  try {
    await walletService.reverse(session, entryId);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return { success: false, error: 'Esta transação já foi estornada' };
      }
      if (err.status === 404) {
        return { success: false, error: 'Transação não encontrada' };
      }
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Serviço indisponível. Tente novamente.' };
  }
}

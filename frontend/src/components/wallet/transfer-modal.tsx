'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transferSchema, type TransferSchema } from '@/schemas/wallet.schema';
import { transferAction } from '@/actions/wallet.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TransferModalProps {
  onClose: () => void;
}

export function TransferModal({ onClose }: TransferModalProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransferSchema>({
    resolver: zodResolver(transferSchema),
  });

  const onSubmit = async (data: TransferSchema) => {
    setServerError(null);
    const result = await transferAction(data);
    if (!result || !result.success) {
      const error = result?.error ?? 'Erro inesperado. Tente novamente.';
      if (error.includes('Sessão expirada')) {
        router.push('/login');
        return;
      }
      setServerError(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Transferir Saldo</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="recipientId"
            type="text"
            label="ID do destinatário"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            error={errors.recipientId?.message}
            {...register('recipientId')}
          />

          <Input
            id="amount"
            type="number"
            step="0.01"
            label="Valor (R$)"
            placeholder="0,00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            id="description"
            type="text"
            label="Descrição (opcional)"
            placeholder="ex: Pagamento de aluguel"
            error={errors.description?.message}
            {...register('description')}
          />

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">
              Transferir
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

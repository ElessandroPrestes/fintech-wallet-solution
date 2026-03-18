import { z } from 'zod';

export const depositSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .min(0.01, 'Valor mínimo: R$ 0,01')
    .max(1_000_000, 'Valor máximo: R$ 1.000.000,00'),
  description: z.string().optional(),
});

export type DepositSchema = z.infer<typeof depositSchema>;

export const transferSchema = z.object({
  recipientId: z.string().uuid('ID do destinatário inválido'),
  amount: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .min(0.01, 'Valor mínimo: R$ 0,01')
    .max(100_000, 'Valor máximo: R$ 100.000,00'),
  description: z.string().optional(),
});

export type TransferSchema = z.infer<typeof transferSchema>;

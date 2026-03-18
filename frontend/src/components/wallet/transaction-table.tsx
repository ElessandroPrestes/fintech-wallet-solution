'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { reverseAction } from '@/actions/wallet.actions';
import type { LedgerEntry, EntryKind } from '@/types/wallet';

const KIND_LABEL: Record<EntryKind, string> = {
  DEPOSIT: 'Depósito',
  TRANSFER_IN: 'Recebimento',
  TRANSFER_OUT: 'Transferência',
  REVERSAL: 'Estorno',
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface ReverseButtonProps {
  entryId: string;
}

function ReverseButton({ entryId }: ReverseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReverse = async () => {
    setLoading(true);
    setError(null);
    const result = await reverseAction(entryId);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReverse}
        disabled={loading}
        className={cn(
          'rounded px-2 py-1 text-xs font-medium text-gray-500',
          'border border-gray-200 hover:border-gray-400 hover:text-gray-700',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
        )}
      >
        {loading ? 'Processando...' : 'Estornar'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TransactionTableProps {
  entries: LedgerEntry[];
}

export function TransactionTable({ entries }: TransactionTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-400">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-700">Extrato</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {entries.map((entry) => {
          const isCredit = entry.type === 'CREDIT';
          const isReversal = entry.kind === 'REVERSAL';

          return (
            <div key={entry.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isCredit
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700',
                  )}
                >
                  {isCredit ? 'Crédito' : 'Débito'}
                </span>

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {KIND_LABEL[entry.kind]}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                  {entry.description && (
                    <p className="text-xs text-gray-500">{entry.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    isCredit ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {isCredit ? '+' : '-'}
                  {formatBRL(entry.amount)}
                </span>

                {!isReversal && !entry.originalEntryId && (
                  <ReverseButton entryId={entry.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

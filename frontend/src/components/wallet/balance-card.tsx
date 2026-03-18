import { cn } from '@/lib/cn';

interface BalanceCardProps {
  balance: number;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const isNegative = balance < 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">Saldo disponível</p>
      <p
        className={cn(
          'mt-1 text-4xl font-bold tracking-tight',
          isNegative ? 'text-red-600' : 'text-gray-900',
        )}
      >
        {formatBRL(balance)}
      </p>
      {isNegative && (
        <p className="mt-2 text-xs text-red-500">
          Saldo negativo — realize um depósito para abater a dívida.
        </p>
      )}
    </div>
  );
}

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { walletService } from '@/services/wallet.service';
import { BalanceCard } from '@/components/wallet/balance-card';
import { TransactionTable } from '@/components/wallet/transaction-table';
import { WalletActions } from '@/components/wallet/wallet-actions';

export const metadata: Metadata = {
  title: 'Dashboard | Fintech Wallet',
};

export default async function DashboardPage() {
  const session = getSession();
  if (!session) redirect('/login');

  const wallet = await walletService.getWallet(session).catch(() => null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-col gap-6">
        <BalanceCard balance={wallet?.balance ?? 0} />
        <WalletActions />
        <TransactionTable entries={wallet?.ledgerEntries ?? []} />
      </div>
    </main>
  );
}

import { httpClient } from '@/lib/http-client';
import type { WalletData, LedgerEntry } from '@/types/wallet';

export const walletService = {
  getWallet(token: string): Promise<WalletData> {
    return httpClient<WalletData>('/wallet', {
      token,
      tags: ['wallet'],
    });
  },

  deposit(token: string, amount: number, description?: string): Promise<WalletData> {
    return httpClient<WalletData>('/wallet/deposit', {
      method: 'POST',
      body: { amount, description },
      token,
    });
  },

  transfer(
    token: string,
    recipientId: string,
    amount: number,
    description?: string,
  ): Promise<WalletData> {
    return httpClient<WalletData>('/wallet/transfer', {
      method: 'POST',
      body: { recipientId, amount, description },
      token,
    });
  },

  reverse(token: string, entryId: string): Promise<LedgerEntry> {
    return httpClient<LedgerEntry>(`/wallet/reverse/${entryId}`, {
      method: 'POST',
      token,
    });
  },
};

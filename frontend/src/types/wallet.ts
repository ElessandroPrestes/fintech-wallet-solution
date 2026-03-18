export type EntryType = 'CREDIT' | 'DEBIT';
export type EntryKind = 'DEPOSIT' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REVERSAL';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  kind: EntryKind;
  amount: number;
  description: string;
  originalEntryId: string | null;
  createdAt: string;
}

export interface WalletData {
  id: string;
  balance: number;
  ledgerEntries?: LedgerEntry[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum EntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum EntryKind {
  DEPOSIT = 'DEPOSIT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  REVERSAL = 'REVERSAL',
}

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.ledgerEntries)
  @JoinColumn()
  wallet: Wallet;

  @Column({ type: 'enum', enum: EntryType })
  type: EntryType;

  @Column({ type: 'enum', enum: EntryKind })
  kind: EntryKind;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  originalEntryId: string;

  @Column({ nullable: true })
  relatedWalletId: string;

  @CreateDateColumn()
  createdAt: Date;
}

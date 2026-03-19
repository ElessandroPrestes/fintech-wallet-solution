import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind } from '../entities/ledger-entry.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
  ) {}

  createQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  async createForUser(userId: string): Promise<Wallet> {
    const wallet = this.walletRepo.create({ user: { id: userId }, balance: 0 });
    return this.walletRepo.save(wallet);
  }

  findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: ['ledgerEntries'],
      order: { ledgerEntries: { createdAt: 'DESC' } },
    });
  }

  async findOrCreateForUser(userId: string, qr: QueryRunner): Promise<Wallet> {
    const existing = await qr.manager.findOne(Wallet, {
      where: { user: { id: userId } },
    });
    if (existing) return existing;

    const wallet = qr.manager.create(Wallet, {
      user: { id: userId },
      balance: 0,
    });
    return qr.manager.save(Wallet, wallet);
  }

  findByWalletId(walletId: string, qr: QueryRunner): Promise<Wallet | null> {
    return qr.manager.findOne(Wallet, { where: { id: walletId } });
  }

  findLedgerEntryById(id: string, qr: QueryRunner): Promise<LedgerEntry | null> {
    return qr.manager.findOne(LedgerEntry, {
      where: { id },
      relations: ['wallet'],
    });
  }

  async hasReversal(originalEntryId: string, qr: QueryRunner): Promise<boolean> {
    const count = await qr.manager.count(LedgerEntry, {
      where: { originalEntryId, kind: EntryKind.REVERSAL },
    });
    return count > 0;
  }
}

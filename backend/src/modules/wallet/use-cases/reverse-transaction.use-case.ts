import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { WalletRepository } from '../repositories/wallet.repository';
import { LedgerEntryResponseDto } from '../dto/ledger-entry-response.dto';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';

@Injectable()
export class ReverseTransactionUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(userId: string, entryId: string): Promise<LedgerEntryResponseDto> {
    const qr: QueryRunner = this.walletRepository.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const originalEntry = await this.walletRepository.findLedgerEntryById(entryId, qr);

      if (!originalEntry) {
        throw new NotFoundException('Entrada de ledger não encontrada');
      }

      const alreadyReversed = await this.walletRepository.hasReversal(entryId, qr);
      if (alreadyReversed) {
        throw new ConflictException('Esta transação já foi estornada');
      }

      // O tipo da reversão é sempre oposto ao original
      const reversalType =
        originalEntry.type === EntryType.CREDIT ? EntryType.DEBIT : EntryType.CREDIT;

      const wallet = originalEntry.wallet;
      const currentBalance = Number(wallet.balance);

      // Desfaz o efeito financeiro da entrada original
      wallet.balance =
        reversalType === EntryType.DEBIT
          ? currentBalance - Number(originalEntry.amount)
          : currentBalance + Number(originalEntry.amount);

      await qr.manager.save(Wallet, wallet);

      const reversalEntry = qr.manager.create(LedgerEntry, {
        wallet: { id: wallet.id },
        type: reversalType,
        kind: EntryKind.REVERSAL,
        amount: originalEntry.amount,
        description: `Estorno: ${originalEntry.description ?? originalEntry.kind}`,
        originalEntryId: originalEntry.id,
      });

      const saved = await qr.manager.save(LedgerEntry, reversalEntry);

      await qr.commitTransaction();
      return LedgerEntryResponseDto.fromEntity(saved);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}

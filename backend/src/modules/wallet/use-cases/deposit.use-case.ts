import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { WalletRepository } from '../repositories/wallet.repository';
import { DepositDto } from '../dto/deposit.dto';
import { WalletResponseDto } from '../dto/wallet-response.dto';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';

@Injectable()
export class DepositUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(userId: string, dto: DepositDto): Promise<WalletResponseDto> {
    const qr: QueryRunner = this.walletRepository.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const wallet = await this.walletRepository.findOrCreateForUser(userId, qr);

      // Regra: se saldo for negativo, o depósito abate a dívida antes de creditar o restante.
      // Matematicamente é equivalente a: novoSaldo = saldoAtual + valorDepósito.
      // Ambos os cenários (saldo positivo e negativo) são cobertos pela mesma operação.
      const currentBalance = Number(wallet.balance);
      wallet.balance = currentBalance + dto.amount;

      await qr.manager.save(Wallet, wallet);

      const entry = qr.manager.create(LedgerEntry, {
        wallet: { id: wallet.id },
        type: EntryType.CREDIT,
        kind: EntryKind.DEPOSIT,
        amount: dto.amount,
        description: dto.description ?? 'Depósito',
      });
      await qr.manager.save(LedgerEntry, entry);

      await qr.commitTransaction();
      return WalletResponseDto.fromEntity(wallet);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}

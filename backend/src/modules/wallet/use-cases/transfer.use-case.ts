import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { WalletRepository } from '../repositories/wallet.repository';
import { TransferDto } from '../dto/transfer.dto';
import { WalletResponseDto } from '../dto/wallet-response.dto';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';
import { InsufficientFundsException } from '../../../common/exceptions/insufficient-funds.exception';

@Injectable()
export class TransferUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(senderId: string, dto: TransferDto): Promise<WalletResponseDto> {
    const qr: QueryRunner = this.walletRepository.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const senderWallet = await this.walletRepository.findOrCreateForUser(senderId, qr);

      // Regra: auto-transferência bloqueada por wallet ID (recipientId é o UUID da carteira)
      if (senderWallet.id === dto.recipientId) {
        throw new BadRequestException('Não é possível transferir para a própria carteira');
      }

      // Regra: valida saldo antes de qualquer débito
      const senderBalance = Number(senderWallet.balance);
      if (senderBalance < dto.amount) {
        throw new InsufficientFundsException();
      }

      // Busca carteira do destinatário por wallet ID — nunca cria automaticamente
      const recipientWallet = await this.walletRepository.findByWalletId(dto.recipientId, qr);
      if (!recipientWallet) {
        throw new NotFoundException('Conta destinatária não encontrada');
      }

      senderWallet.balance = senderBalance - dto.amount;
      recipientWallet.balance = Number(recipientWallet.balance) + dto.amount;

      await qr.manager.save(Wallet, senderWallet);
      await qr.manager.save(Wallet, recipientWallet);

      const description = dto.description ?? 'Transferência';

      const debitEntry = qr.manager.create(LedgerEntry, {
        wallet: { id: senderWallet.id },
        type: EntryType.DEBIT,
        kind: EntryKind.TRANSFER_OUT,
        amount: dto.amount,
        description,
        relatedWalletId: recipientWallet.id,
      });

      const creditEntry = qr.manager.create(LedgerEntry, {
        wallet: { id: recipientWallet.id },
        type: EntryType.CREDIT,
        kind: EntryKind.TRANSFER_IN,
        amount: dto.amount,
        description,
        relatedWalletId: senderWallet.id,
      });

      await qr.manager.save(LedgerEntry, debitEntry);
      await qr.manager.save(LedgerEntry, creditEntry);

      await qr.commitTransaction();
      return WalletResponseDto.fromEntity(senderWallet);
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}

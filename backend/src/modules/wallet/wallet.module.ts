import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { WalletRepository } from './repositories/wallet.repository';
import { GetWalletUseCase } from './use-cases/get-wallet.use-case';
import { DepositUseCase } from './use-cases/deposit.use-case';
import { TransferUseCase } from './use-cases/transfer.use-case';
import { ReverseTransactionUseCase } from './use-cases/reverse-transaction.use-case';
import { WalletController } from './wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, LedgerEntry])],
  controllers: [WalletController],
  providers: [
    WalletRepository,
    GetWalletUseCase,
    DepositUseCase,
    TransferUseCase,
    ReverseTransactionUseCase,
  ],
  exports: [WalletRepository],
})
export class WalletModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, LedgerEntry])],
  providers: [],
  exports: [],
})
export class WalletModule {}

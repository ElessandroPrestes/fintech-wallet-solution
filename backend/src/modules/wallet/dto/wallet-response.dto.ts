import { ApiProperty } from '@nestjs/swagger';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntryResponseDto } from './ledger-entry-response.dto';

export class WalletResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() balance: number;
  @ApiProperty({ type: [LedgerEntryResponseDto], required: false })
  ledgerEntries?: LedgerEntryResponseDto[];

  static fromEntity(wallet: Wallet, includeEntries = false): WalletResponseDto {
    const dto = new WalletResponseDto();
    dto.id = wallet.id;
    dto.balance = Number(wallet.balance);
    if (includeEntries && wallet.ledgerEntries) {
      dto.ledgerEntries = wallet.ledgerEntries.map(LedgerEntryResponseDto.fromEntity);
    }
    return dto;
  }
}

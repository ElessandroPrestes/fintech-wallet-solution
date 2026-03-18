import { ApiProperty } from '@nestjs/swagger';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';

export class LedgerEntryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: EntryType }) type: EntryType;
  @ApiProperty({ enum: EntryKind }) kind: EntryKind;
  @ApiProperty() amount: number;
  @ApiProperty() description: string;
  @ApiProperty({ nullable: true }) originalEntryId: string | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(entry: LedgerEntry): LedgerEntryResponseDto {
    const dto = new LedgerEntryResponseDto();
    dto.id = entry.id;
    dto.type = entry.type;
    dto.kind = entry.kind;
    dto.amount = Number(entry.amount);
    dto.description = entry.description;
    dto.originalEntryId = entry.originalEntryId ?? null;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

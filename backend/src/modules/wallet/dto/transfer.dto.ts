import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'uuid-do-usuario-destinatario' })
  @IsUUID('4', { message: 'ID do destinatário inválido' })
  recipientId: string;

  @ApiProperty({ example: 50.0, description: 'Valor a transferir (mín: 0.01)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo de transferência é R$ 0,01' })
  @Max(100_000, { message: 'O valor máximo por transferência é R$ 100.000,00' })
  amount: number;

  @ApiProperty({ required: false, example: 'Pagamento de aluguel' })
  @IsOptional()
  @IsString()
  description?: string;
}

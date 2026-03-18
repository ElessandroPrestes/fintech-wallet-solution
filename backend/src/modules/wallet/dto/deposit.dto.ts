import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 150.0, description: 'Valor a depositar (mín: 0.01)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'O valor mínimo de depósito é R$ 0,01' })
  @Max(1_000_000, { message: 'O valor máximo por depósito é R$ 1.000.000,00' })
  amount: number;

  @ApiProperty({ required: false, example: 'Depósito via PIX' })
  @IsOptional()
  @IsString()
  description?: string;
}

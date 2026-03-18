import { BadRequestException } from '@nestjs/common';

export class InsufficientFundsException extends BadRequestException {
  constructor() {
    super('Saldo insuficiente para realizar a transferência');
  }
}

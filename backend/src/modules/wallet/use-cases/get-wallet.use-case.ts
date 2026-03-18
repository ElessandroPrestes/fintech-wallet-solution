import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repository';
import { WalletResponseDto } from '../dto/wallet-response.dto';

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(userId: string): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Carteira não encontrada');
    }

    return WalletResponseDto.fromEntity(wallet, true);
  }
}

import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { WalletRepository } from '../../wallet/repositories/wallet.repository';

@Injectable()
export class CreateUserUseCase {
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly walletRepository: WalletRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const emailTaken = await this.usersRepository.exists(dto.email);

    if (emailTaken) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersRepository.save({
      email: dto.email.toLowerCase().trim(),
      name: dto.name.trim(),
      passwordHash,
    });

    await this.walletRepository.createForUser(user.id);

    return UserResponseDto.fromEntity(user);
  }
}

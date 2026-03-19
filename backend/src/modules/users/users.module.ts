import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UsersController } from './users.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), WalletModule],
  controllers: [UsersController],
  providers: [UsersRepository, CreateUserUseCase],
  exports: [UsersRepository],
})
export class UsersModule {}

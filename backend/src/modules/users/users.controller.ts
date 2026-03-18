import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiConflictResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserUseCase } from './use-cases/create-user.use-case';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  constructor(private readonly createUser: CreateUserUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'E-mail já cadastrado' })
  register(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUser.execute(dto);
  }
}

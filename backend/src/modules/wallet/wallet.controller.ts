import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { LedgerEntryResponseDto } from './dto/ledger-entry-response.dto';
import { GetWalletUseCase } from './use-cases/get-wallet.use-case';
import { DepositUseCase } from './use-cases/deposit.use-case';
import { TransferUseCase } from './use-cases/transfer.use-case';
import { ReverseTransactionUseCase } from './use-cases/reverse-transaction.use-case';

@ApiTags('Carteira')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly getWallet: GetWalletUseCase,
    private readonly deposit: DepositUseCase,
    private readonly transfer: TransferUseCase,
    private readonly reverseTransaction: ReverseTransactionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consultar saldo e extrato da carteira' })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiNotFoundResponse({ description: 'Carteira não encontrada' })
  getMyWallet(@CurrentUser() user: JwtPayload): Promise<WalletResponseDto> {
    return this.getWallet.execute(user.sub);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Depositar saldo na carteira' })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiBadRequestResponse({ description: 'Valor inválido' })
  makeDeposit(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DepositDto,
  ): Promise<WalletResponseDto> {
    return this.deposit.execute(user.sub, dto);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transferir saldo para outro usuário' })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiBadRequestResponse({ description: 'Saldo insuficiente ou destinatário inválido' })
  makeTransfer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TransferDto,
  ): Promise<WalletResponseDto> {
    return this.transfer.execute(user.sub, dto);
  }

  @Post('reverse/:entryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estornar uma transação pelo ID da entrada no ledger' })
  @ApiOkResponse({ type: LedgerEntryResponseDto })
  @ApiNotFoundResponse({ description: 'Entrada não encontrada' })
  @ApiConflictResponse({ description: 'Transação já estornada' })
  reverseEntry(
    @CurrentUser() user: JwtPayload,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
  ): Promise<LedgerEntryResponseDto> {
    return this.reverseTransaction.execute(user.sub, entryId);
  }
}

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferUseCase } from './transfer.use-case';
import { WalletRepository } from '../repositories/wallet.repository';
import { TransferDto } from '../dto/transfer.dto';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';
import { InsufficientFundsException } from '../../../common/exceptions/insufficient-funds.exception';

const makeWallet = (id: string, balance: number): Wallet =>
  ({ id, balance, ledgerEntries: [] }) as unknown as Wallet;

const makeQueryRunner = (senderBalance: number, recipientBalance = 0) => {
  const sender = makeWallet('wallet-sender', senderBalance);
  const recipient = makeWallet('wallet-recipient', recipientBalance);

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
      save: jest.fn().mockImplementation(async (_entity, data) => data),
    },
    _sender: sender,
    _recipient: recipient,
  };
};

// senderId  = userId do remetente
// recipientWalletId = wallet UUID do destinatário (é isso que o frontend envia)
const mockRepo = (
  senderId: string,
  recipientWalletId: string,
  senderBalance: number,
  recipientBalance = 0,
) => {
  const qr = makeQueryRunner(senderBalance, recipientBalance);
  const repo = {
    createQueryRunner: jest.fn().mockReturnValue(qr),
    findOrCreateForUser: jest.fn().mockResolvedValue(qr._sender),
    findByWalletId: jest.fn().mockImplementation(async (walletId: string) => {
      return walletId === recipientWalletId ? qr._recipient : null;
    }),
  } as unknown as jest.Mocked<WalletRepository>;
  return { repo, qr };
};

describe('TransferUseCase', () => {
  const SENDER_USER_ID = 'user-sender';
  const SENDER_WALLET_ID = 'wallet-sender'; // wallet ID do remetente
  const RECIPIENT_WALLET_ID = 'wallet-recipient'; // wallet ID do destinatário

  describe('execute()', () => {
    it('deve debitar o remetente e creditar o destinatário', async () => {
      const { repo, qr } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 500, 100);
      const useCase = new TransferUseCase(repo);

      const dto: TransferDto = { recipientId: RECIPIENT_WALLET_ID, amount: 200 };
      const result = await useCase.execute(SENDER_USER_ID, dto);

      expect(result.balance).toBe(300); // 500 - 200
      expect(qr._recipient.balance).toBe(300); // 100 + 200
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('deve criar entrada DEBIT/TRANSFER_OUT para o remetente', async () => {
      const { repo, qr } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 300);
      const useCase = new TransferUseCase(repo);

      await useCase.execute(SENDER_USER_ID, { recipientId: RECIPIENT_WALLET_ID, amount: 100 });

      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({ type: EntryType.DEBIT, kind: EntryKind.TRANSFER_OUT }),
      );
    });

    it('deve criar entrada CREDIT/TRANSFER_IN para o destinatário', async () => {
      const { repo, qr } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 300);
      const useCase = new TransferUseCase(repo);

      await useCase.execute(SENDER_USER_ID, { recipientId: RECIPIENT_WALLET_ID, amount: 100 });

      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({ type: EntryType.CREDIT, kind: EntryKind.TRANSFER_IN }),
      );
    });

    it('deve lançar InsufficientFundsException quando o saldo for menor que o valor', async () => {
      const { repo } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 50);
      const useCase = new TransferUseCase(repo);

      await expect(
        useCase.execute(SENDER_USER_ID, { recipientId: RECIPIENT_WALLET_ID, amount: 100 }),
      ).rejects.toThrow(InsufficientFundsException);
    });

    it('deve lançar InsufficientFundsException quando o saldo for exatamente zero', async () => {
      const { repo } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 0);
      const useCase = new TransferUseCase(repo);

      await expect(
        useCase.execute(SENDER_USER_ID, { recipientId: RECIPIENT_WALLET_ID, amount: 0.01 }),
      ).rejects.toThrow(InsufficientFundsException);
    });

    it('deve permitir transferência quando o saldo for igual ao valor', async () => {
      const { repo, qr } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 100);
      const useCase = new TransferUseCase(repo);

      const result = await useCase.execute(SENDER_USER_ID, {
        recipientId: RECIPIENT_WALLET_ID,
        amount: 100,
      });

      expect(result.balance).toBe(0);
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException ao tentar transferir para a própria carteira', async () => {
      const { repo } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 500);
      const useCase = new TransferUseCase(repo);

      // recipientId é o wallet ID do próprio remetente
      await expect(
        useCase.execute(SENDER_USER_ID, { recipientId: SENDER_WALLET_ID, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando a carteira destinatária não existir', async () => {
      const { repo } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 500);
      const useCase = new TransferUseCase(repo);

      await expect(
        useCase.execute(SENDER_USER_ID, { recipientId: 'wallet-inexistente', amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve chamar rollbackTransaction e relançar o erro em caso de falha', async () => {
      const { repo, qr } = mockRepo(SENDER_USER_ID, RECIPIENT_WALLET_ID, 500);
      qr.manager.save = jest.fn().mockRejectedValue(new Error('DB error'));
      const useCase = new TransferUseCase(repo);

      await expect(
        useCase.execute(SENDER_USER_ID, { recipientId: RECIPIENT_WALLET_ID, amount: 100 }),
      ).rejects.toThrow('DB error');
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });
});

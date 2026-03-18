import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReverseTransactionUseCase } from './reverse-transaction.use-case';
import { WalletRepository } from '../repositories/wallet.repository';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';

const makeWallet = (balance: number): Wallet =>
  ({ id: 'wallet-1', balance } as unknown as Wallet);

const makeEntry = (
  type: EntryType,
  amount: number,
  wallet: Wallet,
  overrides: Partial<LedgerEntry> = {},
): LedgerEntry =>
  ({
    id: 'entry-1',
    type,
    kind: EntryKind.DEPOSIT,
    amount,
    description: 'Depósito',
    wallet,
    originalEntryId: null,
    ...overrides,
  } as unknown as LedgerEntry);

const makeQueryRunner = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
    save: jest.fn().mockImplementation(async (_entity, data) => ({ id: 'reversal-id', ...data })),
  },
});

describe('ReverseTransactionUseCase', () => {
  describe('execute()', () => {
    it('deve criar entrada DEBIT/REVERSAL ao estornar uma entrada CREDIT', async () => {
      const wallet = makeWallet(200);
      const entry = makeEntry(EntryType.CREDIT, 100, wallet);
      const qr = makeQueryRunner();

      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(entry),
        hasReversal: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);
      await useCase.execute('user-1', 'entry-1');

      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({
          type: EntryType.DEBIT,
          kind: EntryKind.REVERSAL,
          originalEntryId: 'entry-1',
        }),
      );
    });

    it('deve criar entrada CREDIT/REVERSAL ao estornar uma entrada DEBIT', async () => {
      const wallet = makeWallet(0);
      const entry = makeEntry(EntryType.DEBIT, 100, wallet);
      const qr = makeQueryRunner();

      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(entry),
        hasReversal: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);
      await useCase.execute('user-1', 'entry-1');

      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({ type: EntryType.CREDIT }),
      );
    });

    it('deve ajustar o saldo da wallet ao reverter uma entrada CREDIT', async () => {
      const wallet = makeWallet(200);
      const entry = makeEntry(EntryType.CREDIT, 100, wallet);
      const qr = makeQueryRunner();

      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(entry),
        hasReversal: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);
      await useCase.execute('user-1', 'entry-1');

      // Estorno de CREDIT → DEBIT: 200 - 100 = 100
      expect(qr.manager.save).toHaveBeenCalledWith(
        Wallet,
        expect.objectContaining({ balance: 100 }),
      );
    });

    it('deve lançar NotFoundException quando a entrada não existir', async () => {
      const qr = makeQueryRunner();
      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(null),
        hasReversal: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);

      await expect(useCase.execute('user-1', 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException ao tentar estornar uma entrada já estornada', async () => {
      const wallet = makeWallet(100);
      const entry = makeEntry(EntryType.CREDIT, 100, wallet);
      const qr = makeQueryRunner();

      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(entry),
        hasReversal: jest.fn().mockResolvedValue(true),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);

      await expect(useCase.execute('user-1', 'entry-1')).rejects.toThrow(ConflictException);
    });

    it('deve chamar rollbackTransaction e relançar o erro em caso de falha', async () => {
      const wallet = makeWallet(100);
      const entry = makeEntry(EntryType.CREDIT, 100, wallet);
      const qr = makeQueryRunner();
      qr.manager.save = jest.fn().mockRejectedValue(new Error('DB error'));

      const repo = {
        createQueryRunner: jest.fn().mockReturnValue(qr),
        findLedgerEntryById: jest.fn().mockResolvedValue(entry),
        hasReversal: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<WalletRepository>;

      const useCase = new ReverseTransactionUseCase(repo);

      await expect(useCase.execute('user-1', 'entry-1')).rejects.toThrow('DB error');
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });
});

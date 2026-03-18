import { DepositUseCase } from './deposit.use-case';
import { WalletRepository } from '../repositories/wallet.repository';
import { DepositDto } from '../dto/deposit.dto';
import { Wallet } from '../entities/wallet.entity';
import { LedgerEntry, EntryKind, EntryType } from '../entities/ledger-entry.entity';

const makeWallet = (balance: number): Wallet =>
  ({ id: 'wallet-1', balance, ledgerEntries: [] }) as unknown as Wallet;

const makeQueryRunner = (walletOverride?: Wallet) => {
  const wallet = walletOverride ?? makeWallet(0);
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
      save: jest.fn().mockResolvedValue(wallet),
    },
  };
};

const mockRepo = (wallet: Wallet, qr: ReturnType<typeof makeQueryRunner>) => {
  const repo = {
    createQueryRunner: jest.fn().mockReturnValue(qr),
    findOrCreateForUser: jest.fn().mockResolvedValue(wallet),
  } as unknown as jest.Mocked<WalletRepository>;
  return repo;
};

describe('DepositUseCase', () => {
  describe('execute()', () => {
    it('deve creditar o valor ao saldo e salvar um LedgerEntry do tipo CREDIT/DEPOSIT', async () => {
      const wallet = makeWallet(200);
      const qr = makeQueryRunner(wallet);
      const repo = mockRepo(wallet, qr);
      const useCase = new DepositUseCase(repo);

      const dto: DepositDto = { amount: 50 };
      const result = await useCase.execute('user-1', dto);

      expect(result.balance).toBe(250);
      expect(qr.manager.save).toHaveBeenCalledWith(
        Wallet,
        expect.objectContaining({ balance: 250 }),
      );
      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({ type: EntryType.CREDIT, kind: EntryKind.DEPOSIT, amount: 50 }),
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('deve abater dívida quando o saldo for negativo e ainda creditar o restante', async () => {
      const wallet = makeWallet(-80);
      const qr = makeQueryRunner(wallet);
      const repo = mockRepo(wallet, qr);
      const useCase = new DepositUseCase(repo);

      const dto: DepositDto = { amount: 100 };
      const result = await useCase.execute('user-1', dto);

      // -80 + 100 = 20 (dívida de 80 abatida, saldo restante 20)
      expect(result.balance).toBe(20);
      expect(qr.manager.save).toHaveBeenCalledWith(
        Wallet,
        expect.objectContaining({ balance: 20 }),
      );
    });

    it('deve abater apenas parte da dívida quando o depósito não cobre o total', async () => {
      const wallet = makeWallet(-150);
      const qr = makeQueryRunner(wallet);
      const repo = mockRepo(wallet, qr);
      const useCase = new DepositUseCase(repo);

      const dto: DepositDto = { amount: 50 };
      const result = await useCase.execute('user-1', dto);

      // -150 + 50 = -100 (dívida parcialmente abatida)
      expect(result.balance).toBe(-100);
    });

    it('deve usar a descrição padrão quando não for informada', async () => {
      const wallet = makeWallet(0);
      const qr = makeQueryRunner(wallet);
      const repo = mockRepo(wallet, qr);
      const useCase = new DepositUseCase(repo);

      await useCase.execute('user-1', { amount: 10 });

      expect(qr.manager.create).toHaveBeenCalledWith(
        LedgerEntry,
        expect.objectContaining({ description: 'Depósito' }),
      );
    });

    it('deve chamar rollbackTransaction e relançar o erro em caso de falha', async () => {
      const wallet = makeWallet(100);
      const qr = makeQueryRunner(wallet);
      qr.manager.save = jest.fn().mockRejectedValue(new Error('DB error'));
      const repo = mockRepo(wallet, qr);
      const useCase = new DepositUseCase(repo);

      await expect(useCase.execute('user-1', { amount: 50 })).rejects.toThrow('DB error');
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });
});

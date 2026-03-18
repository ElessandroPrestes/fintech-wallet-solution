import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { User } from '../entities/user.entity';

const mockUsersRepository = () =>
  ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
    exists: jest.fn(),
  }) as unknown as jest.Mocked<UsersRepository>;

const makeDto = (overrides: Partial<CreateUserDto> = {}): CreateUserDto => ({
  email: 'joao@email.com',
  name: 'João Silva',
  password: 'Senha@123',
  ...overrides,
});

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(() => {
    repo = mockUsersRepository();
    useCase = new CreateUserUseCase(repo);
  });

  describe('execute()', () => {
    it('deve criar o usuário e retornar UserResponseDto sem a senha', async () => {
      repo.exists.mockResolvedValue(false);
      repo.save.mockResolvedValue({
        id: 'uuid-1',
        email: 'joao@email.com',
        name: 'João Silva',
        passwordHash: 'hashed',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      } as User);

      const result = await useCase.execute(makeDto());

      expect(result.id).toBe('uuid-1');
      expect(result.email).toBe('joao@email.com');
      expect(result.name).toBe('João Silva');
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('deve normalizar o e-mail para lowercase e remover espaços', async () => {
      repo.exists.mockResolvedValue(false);
      repo.save.mockResolvedValue({
        id: 'uuid-2',
        email: 'joao@email.com',
        name: 'João Silva',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User);

      await useCase.execute(makeDto({ email: '  JOAO@EMAIL.COM  ' }));

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'joao@email.com' }));
    });

    it('deve lançar ConflictException quando o e-mail já estiver cadastrado', async () => {
      repo.exists.mockResolvedValue(true);

      await expect(useCase.execute(makeDto())).rejects.toThrow(ConflictException);
    });

    it('não deve chamar repo.save quando o e-mail já existir', async () => {
      repo.exists.mockResolvedValue(true);

      await useCase.execute(makeDto()).catch(() => null);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('deve fazer hash da senha (nunca armazenar plain-text)', async () => {
      repo.exists.mockResolvedValue(false);
      repo.save.mockResolvedValue({
        id: 'uuid-3',
        email: 'joao@email.com',
        name: 'João Silva',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User);

      await useCase.execute(makeDto({ password: 'Senha@123' }));

      const savedArg = repo.save.mock.calls[0][0] as Partial<User>;
      expect(savedArg.passwordHash).not.toBe('Senha@123');
      expect(savedArg.passwordHash).toBeTruthy();
    });

    it('deve verificar a existência pelo e-mail antes de salvar', async () => {
      repo.exists.mockResolvedValue(false);
      repo.save.mockResolvedValue({
        id: 'uuid-4',
        email: 'joao@email.com',
        name: 'João Silva',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User);

      await useCase.execute(makeDto());

      expect(repo.exists).toHaveBeenCalledWith('joao@email.com');
    });
  });
});

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/repositories/users.repository';
import { User } from '../users/entities/user.entity';

const HASHED_PASSWORD = bcrypt.hashSync('Senha@123', 10);

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'uuid-1',
    email: 'joao@email.com',
    name: 'João Silva',
    passwordHash: HASHED_PASSWORD,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as User;

const mockRepo = () =>
  ({
    findByEmail: jest.fn(),
  }) as unknown as jest.Mocked<UsersRepository>;

const mockJwt = () =>
  ({
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
  }) as unknown as jest.Mocked<JwtService>;

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<UsersRepository>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(() => {
    repo = mockRepo();
    jwt = mockJwt();
    service = new AuthService(repo, jwt);
  });

  describe('validateUser()', () => {
    it('deve retornar o usuário quando as credenciais forem válidas', async () => {
      const user = makeUser();
      repo.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('joao@email.com', 'Senha@123');

      expect(result).toEqual(user);
    });

    it('deve retornar null quando o usuário não for encontrado', async () => {
      repo.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('inexistente@email.com', 'Senha@123');

      expect(result).toBeNull();
    });

    it('deve retornar null quando a senha estiver incorreta', async () => {
      const user = makeUser();
      repo.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('joao@email.com', 'SenhaErrada@1');

      expect(result).toBeNull();
    });

    it('deve normalizar o e-mail para lowercase antes de buscar', async () => {
      repo.findByEmail.mockResolvedValue(null);

      await service.validateUser('  JOAO@EMAIL.COM  ', 'Senha@123');

      expect(repo.findByEmail).toHaveBeenCalledWith('joao@email.com');
    });

    it('não deve comparar senha quando o usuário não existir (evita timing attack)', async () => {
      repo.findByEmail.mockResolvedValue(null);
      const bcryptSpy = jest.spyOn(bcrypt, 'compare');

      await service.validateUser('naoexiste@email.com', 'Senha@123');

      expect(bcryptSpy).not.toHaveBeenCalled();
      bcryptSpy.mockRestore();
    });
  });

  describe('login()', () => {
    it('deve retornar accessToken e dados do usuário', () => {
      const user = makeUser();

      const result = service.login(user);

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
    });

    it('deve assinar o JWT com sub e email do usuário', () => {
      const user = makeUser();

      service.login(user);

      expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
    });

    it('não deve expor o passwordHash na resposta', () => {
      const user = makeUser();

      const result = service.login(user);

      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });
});

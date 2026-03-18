# fintech-wallet-solution

Plataforma de carteira digital para transferências, depósitos e estornos, construída sobre um modelo de **Ledger imutável** com stack moderna e pronta para produção.

**Autor:** Elessandro Prestes Macedo
**Repositório:** [github.com/ElessandroPrestes/fintech-wallet-solution](https://github.com/ElessandroPrestes/fintech-wallet-solution)

---

## Sumário

- [Início Rápido](#início-rápido)
- [Arquitetura](#arquitetura)
- [Destaques Técnicos](#destaques-técnicos)
- [Stack](#stack)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [CI/CD](#cicd)

---

## Início Rápido

### Pré-requisitos

- Docker >= 24
- Docker Compose >= 2.20

### Subir o ambiente completo

```bash
git clone git@github.com:ElessandroPrestes/fintech-wallet-solution.git
cd fintech-wallet-solution
cp .env.example .env   # ajuste as variáveis conforme necessário
docker compose up --build
```

| Serviço    | URL                       |
|------------|---------------------------|
| Frontend   | http://localhost:3000     |
| API REST   | http://localhost:3001     |
| Swagger    | http://localhost:3001/api |
| PostgreSQL | localhost:5432            |

```bash
# Parar e remover volumes
docker compose down -v
```

---

## Arquitetura

O projeto é um **monorepo** com três camadas independentes:

```
/
├── backend/         # API REST — NestJS + TypeScript
├── frontend/        # SSR/Server Actions — Next.js 14 App Router + TypeScript
└── .github/         # Pipeline de CI (GitHub Actions)
```

### Backend — Clean Architecture

Cada módulo segue uma única direção de dependência:

```
Controller → Use Case → Repository → Entity
```

```
backend/src/
├── config/            # Configuração centralizada (app.config.ts)
├── database/          # TypeORM async com SSL condicional
├── common/
│   ├── decorators/    # @CurrentUser()
│   ├── exceptions/    # InsufficientFundsException
│   └── guards/        # JwtAuthGuard
└── modules/
    ├── auth/          # LocalStrategy, JwtStrategy, AuthService, AuthController
    ├── users/         # CreateUserUseCase, UsersRepository, UsersController
    └── wallet/        # DepositUseCase, TransferUseCase, ReverseTransactionUseCase
                       # WalletRepository, WalletController
                       # Entities: Wallet, LedgerEntry
```

### Frontend — Next.js App Router com Server Actions

```
frontend/src/
├── actions/      # Server Actions: loginAction, depositAction, transferAction, reverseAction
├── services/     # authService, walletService (chamadas ao backend via httpClient)
├── lib/          # httpClient (Fetch API), session (httpOnly cookie), cn (Tailwind utils)
├── schemas/      # Validação Zod: loginSchema, registerSchema, depositSchema, transferSchema
├── components/
│   ├── ui/       # Input, Button (reutilizáveis)
│   ├── forms/    # LoginForm (react-hook-form + zod)
│   ├── layout/   # Header
│   └── wallet/   # BalanceCard, TransactionTable, TransferModal, DepositModal, WalletActions
└── app/
    ├── (auth)/login/      # Página de login
    └── (private)/
        ├── layout.tsx     # Layout com Header + proteção de rota
        └── dashboard/     # Server Component: busca wallet e extrato autenticados
```

**Roteamento Docker:** As Server Actions usam `API_URL=http://backend:3001` (rede interna Docker). O browser usa `NEXT_PUBLIC_API_URL=http://localhost:3001`.

---

## Destaques Técnicos

### Ledger Imutável

Nenhum saldo é sobrescrito diretamente. Cada operação financeira gera uma entrada imutável na tabela `ledger_entries`:

| Campo            | Descrição                                              |
|------------------|--------------------------------------------------------|
| `type`           | `CREDIT` ou `DEBIT`                                    |
| `kind`           | `DEPOSIT`, `TRANSFER_IN`, `TRANSFER_OUT`, `REVERSAL`   |
| `originalEntryId`| Liga o estorno à entrada original (rastreabilidade)    |

O saldo pode ser auditado como `SUM(CREDIT) - SUM(DEBIT)` a qualquer momento, independente do campo `balance`.

### Atomicidade com QueryRunner

Toda operação financeira (depósito, transferência, estorno) usa **transações explícitas do TypeORM** via `QueryRunner`:

```typescript
const qr = this.walletRepository.createQueryRunner();
await qr.connect();
await qr.startTransaction();
try {
  // atualiza wallet + insere ledger entry na mesma transação
  await qr.commitTransaction();
} catch (err) {
  await qr.rollbackTransaction();
  throw err;
} finally {
  await qr.release();
}
```

Isso garante que nunca haverá um débito sem a respectiva entrada no ledger.

### Proteção contra Estorno Duplo

Antes de criar uma entrada de `REVERSAL`, o sistema verifica:

```typescript
const alreadyReversed = await this.walletRepository.hasReversal(entryId, qr);
if (alreadyReversed) throw new ConflictException('Esta transação já foi estornada');
```

### Regra de Saldo Negativo

Depósitos sempre são permitidos. Se o saldo estiver negativo, o depósito abate a dívida automaticamente:

```
saldo atual: -R$ 80,00  +  depósito: R$ 100,00  =  novo saldo: R$ 20,00
```

Transferências, por outro lado, exigem `saldo >= valor` e lançam `InsufficientFundsException` (HTTP 400) caso contrário.

### Sessão via Cookie httpOnly

O token JWT é armazenado em um cookie `httpOnly` + `secure` (em produção) + `sameSite: lax`, eliminando exposição via `localStorage` e ataques XSS:

```typescript
cookies().set('wallet.session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 15, // alinhado com JWT_EXPIRES_IN
});
```

### Segurança OWASP

| Camada       | Controle                                                      |
|--------------|---------------------------------------------------------------|
| Headers      | `helmet()` — X-Frame-Options, HSTS, CSP e outros             |
| Rate Limiting | `@nestjs/throttler` — 10 req/s global, 3 req/min em registro |
| Validação    | `class-validator` + `class-transformer` com `whitelist: true` |
| Senhas       | `bcryptjs` com 12 rounds de salt                             |
| Tokens       | JWT de curta duração (15 min) via cookie httpOnly             |

---

## Stack

| Camada      | Tecnologia                                      |
|-------------|-------------------------------------------------|
| Backend     | NestJS 10, TypeScript, TypeORM, Passport        |
| Frontend    | Next.js 14 (App Router), react-hook-form, Zod   |
| Banco       | PostgreSQL 16                                   |
| Auth        | JWT (Passport Local + JWT Strategy)             |
| Docs        | Swagger / OpenAPI 3                             |
| Infra       | Docker, Docker Compose                          |
| CI          | GitHub Actions (lint → test → build)            |
| Qualidade   | ESLint, Prettier, Jest (33 testes unitários)    |

---

## Variáveis de Ambiente

Copie `.env.example` para `.env`:

| Variável              | Descrição                        | Padrão                        |
|-----------------------|----------------------------------|-------------------------------|
| `POSTGRES_USER`       | Usuário do banco                 | `wallet_user`                 |
| `POSTGRES_PASSWORD`   | Senha do banco                   | `wallet_pass`                 |
| `POSTGRES_DB`         | Nome do banco                    | `wallet_db`                   |
| `JWT_SECRET`          | Segredo do access token JWT      | **Obrigatório trocar em prod**|
| `JWT_REFRESH_SECRET`  | Segredo do refresh token         | **Obrigatório trocar em prod**|
| `NEXT_PUBLIC_API_URL` | URL da API (browser)             | `http://localhost:3001`       |

---

## Testes

```bash
cd backend
npm install
npm test              # 33 testes unitários
npm run test:cov      # com relatório de cobertura
```

**Cobertura por módulo:**

| Módulo                     | Testes | Cenários cobertos                                                        |
|----------------------------|--------|--------------------------------------------------------------------------|
| `CreateUserUseCase`        | 6      | criação, normalização de e-mail, conflito, hash de senha                 |
| `AuthService`              | 8      | credenciais válidas/inválidas, timing attack, payload JWT, sem passwordHash |
| `DepositUseCase`           | 5      | depósito normal, abatimento de dívida, dívida parcial, rollback          |
| `TransferUseCase`          | 7      | transferência, débito/crédito, saldo insuficiente, auto-transferência, rollback |
| `ReverseTransactionUseCase`| 6      | estorno de CREDIT/DEBIT, ajuste de saldo, not found, duplo estorno, rollback |

---

## CI/CD

O pipeline `.github/workflows/ci.yml` executa em todo push/PR para `main` ou `develop`:

```
Lint (backend) ──→ Tests (backend + PostgreSQL) ──→ Build (backend)
Lint (frontend) ──────────────────────────────────→ Build (frontend)
```

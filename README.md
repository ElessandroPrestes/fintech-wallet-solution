# fintech-wallet-solution

Plataforma de carteira digital para transferência de saldos, depósitos e estornos, construída com arquitetura de Ledger imutável sobre NestJS + Next.js.

Desenvolvido por **Elessandro Prestes Macedo**.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Como Rodar com Docker](#como-rodar-com-docker)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [CI/CD](#cicd)
- [Decisões de Design](#decisões-de-design)

---

## Arquitetura

O projeto é um **monorepo** estruturado em três camadas independentes:

```
/
├── backend/        # API REST — NestJS + TypeScript
├── frontend/       # SPA/SSR — Next.js App Router + TypeScript
└── .github/        # GitHub Actions (CI Pipeline)
```

### Backend — Clean Architecture

```
backend/src/
├── config/             # Configurações centralizadas (app.config.ts)
├── database/           # DatabaseModule com TypeORM
└── modules/
    ├── auth/           # Autenticação JWT (login, refresh token)
    ├── users/
    │   ├── dto/        # CreateUserDto, UserResponseDto
    │   ├── entities/   # User entity
    │   ├── repositories/
    │   └── use-cases/  # CreateUserUseCase + testes
    └── wallet/
        └── entities/   # Wallet + LedgerEntry (padrão ledger imutável)
```

Cada módulo segue a divisão: `Controller → Use Case → Repository → Entity`.

---

## Stack

| Camada      | Tecnologia                          |
|-------------|--------------------------------------|
| Backend     | NestJS 10, TypeScript, TypeORM       |
| Frontend    | Next.js 14 (App Router), TypeScript  |
| Banco       | PostgreSQL 16                        |
| Auth        | JWT (access + refresh token)         |
| Docs        | Swagger / OpenAPI 3                  |
| Container   | Docker + Docker Compose              |
| CI          | GitHub Actions                       |
| Qualidade   | ESLint, Jest, Supertest              |

---

## Como Rodar com Docker

### Pré-requisitos

- Docker >= 24
- Docker Compose >= 2.20

### Passos

```bash
# 1. Clone o repositório
git clone git@github.com:ElessandroPrestes/fintech-wallet-solution.git
cd fintech-wallet-solution

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Suba todos os serviços
docker compose up -d

# 4. Verifique os logs
docker compose logs -f backend
```

Os serviços estarão disponíveis em:

| Serviço    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| API REST   | http://localhost:3001        |
| Swagger    | http://localhost:3001/api    |
| PostgreSQL | localhost:5432               |

### Parar os serviços

```bash
docker compose down
# Para remover os volumes (banco de dados):
docker compose down -v
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

| Variável              | Descrição                       | Padrão                         |
|-----------------------|---------------------------------|--------------------------------|
| `POSTGRES_USER`       | Usuário do banco                | `wallet_user`                  |
| `POSTGRES_PASSWORD`   | Senha do banco                  | `wallet_pass`                  |
| `POSTGRES_DB`         | Nome do banco                   | `wallet_db`                    |
| `JWT_SECRET`          | Segredo para assinar os JWTs    | **Obrigatório mudar em prod**  |
| `JWT_REFRESH_SECRET`  | Segredo para refresh tokens     | **Obrigatório mudar em prod**  |
| `NEXT_PUBLIC_API_URL` | URL da API para o frontend      | `http://localhost:3001`        |

---

## CI/CD

O pipeline no GitHub Actions (`.github/workflows/ci.yml`) executa em todo push/PR para `main` ou `develop`:

1. **Lint** — ESLint em backend e frontend (paralelamente)
2. **Tests** — Testes unitários e e2e do backend com PostgreSQL de suporte
3. **Build** — Compilação de backend e frontend

---

## Decisões de Design

### Padrão Ledger (Event Sourcing leve)

Cada operação financeira (depósito, transferência, estorno) é registrada como uma **entrada imutável no ledger**. O saldo nunca é sobrescrito — ele é sempre calculado como a soma das entradas (`CREDIT`) menos as saídas (`DEBIT`). Isso garante:

- Auditoria completa e histórico imutável
- Suporte nativo a estornos (uma entrada `REVERSAL` cancela a original)
- Consistência eventual e rastreabilidade

### Reversão / Estorno

Um estorno cria uma nova entrada no ledger do tipo oposto ao original, zerando o efeito da transação. Ambas as entradas ficam vinculadas por `originalEntryId`, permitindo auditoria completa.

### Segurança (OWASP)

- **Helmet** — headers HTTP de segurança
- **Rate Limiting** — throttle por IP via `@nestjs/throttler` (global + por rota sensível)
- **Validação** — `class-validator` + `class-transformer` em todos os DTOs (whitelist ativada)
- **JWT** — tokens de curta duração (15m) com refresh token rotacionado (7d)
- **Bcrypt** — hash de senhas com 12 rounds de salt
- **Variáveis sensíveis** — nunca no código; sempre via `.env`

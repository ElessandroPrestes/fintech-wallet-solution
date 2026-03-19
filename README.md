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
| API REST   | http://localhost:3000/api     |
| Swagger    | http://localhost:3000/api/docs |
| Frontend   | http://localhost:3001     |
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

**Roteamento Docker:** As Server Actions usam `API_URL=http://fintech_wallet_backend:3000` (rede interna Docker via nome do container). O browser usa `NEXT_PUBLIC_API_URL=http://localhost:3000`.

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
| Qualidade   | ESLint, Prettier, Jest (36 testes unitários)    |

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
| `NEXT_PUBLIC_API_URL` | URL da API (browser)             | `http://localhost:3000`       |

---

## Testes

```bash
cd backend
npm install
npm test              # 36 testes unitários
npm run test:cov      # com relatório de cobertura
```

**Cobertura por módulo:**

| Módulo                     | Testes | Cenários cobertos                                                        |
|----------------------------|--------|--------------------------------------------------------------------------|
| `CreateUserUseCase`        | 6      | criação, normalização de e-mail, conflito, hash de senha                 |
| `AuthService`              | 8      | credenciais válidas/inválidas, timing attack, payload JWT, sem passwordHash |
| `DepositUseCase`           | 5      | depósito normal, abatimento de dívida, dívida parcial, rollback          |
| `TransferUseCase`          | 8      | transferência, débito/crédito, saldo insuficiente, auto-transferência, destinatário não encontrado, rollback |
| `ReverseTransactionUseCase`| 6      | estorno de CREDIT/DEBIT, ajuste de saldo, not found, duplo estorno, rollback |

---

## CI/CD

O pipeline `.github/workflows/ci.yml` executa em todo push/PR para `main` ou `develop`:

```
Lint (backend) ──→ Tests (backend + PostgreSQL) ──→ Build (backend)
Lint (frontend) ──────────────────────────────────→ Build (frontend)
```

---

## 🧪 Roteiro de Testes Manuais (End-to-End)

### Pré-requisito

Docker rodando com `docker compose up -d`

- **Frontend:** http://localhost:3001
- **Backend / Swagger:** http://localhost:3000/api/docs

---

### Cenário 1 — Onboarding (Registro e Login)

**1.1 Criar conta do usuário principal**
- Acesse http://localhost:3001/register
- Preencha **Nome completo:** `Alice Teste`
- Preencha **E-mail:** `alice@fintech.com`
- Preencha **Senha:** `Senha@123` (mín. 8 chars, letras e números)
- Preencha **Confirmar senha:** `Senha@123`
- Clique em **Criar conta**
- **Resultado esperado:** redirecionamento para `/login?registered=true`

**1.2 Validações de formulário (testes negativos)**
- Tente registrar com e-mail inválido (ex: `naoéemail`) → erro inline no campo
- Tente registrar com senhas diferentes → erro "As senhas não conferem"
- Tente registrar com o mesmo e-mail `alice@fintech.com` novamente → erro do servidor "E-mail já cadastrado"

**1.3 Login e redirecionamento**
- Acesse http://localhost:3001/login
- Insira `alice@fintech.com` / `Senha@123`
- Clique em **Entrar**
- **Resultado esperado:** redirecionamento automático para `/dashboard`
- Verifique que o saldo exibido é **R$ 0,00**
- Verifique que a tabela de transações está **vazia** (sem entradas)

**1.4 Proteção de rota**
- Sem estar logado, acesse http://localhost:3001/dashboard diretamente
- **Resultado esperado:** redirecionamento para `/login?from=%2Fdashboard`
- Após login, verifique que retorna para o dashboard

---

### Cenário 2 — Preparação de Ambiente (Conta "Cobaia")

*Vamos criar um segundo usuário para ser destinatário das transferências.*

**2.1 Criar conta do cobaia via Interface**
- Abra uma **aba anônima** (para não derrubar a sessão da Alice)
- Acesse http://localhost:3001/register
- Preencha **Nome completo:** `Bob Cobaia`
- Preencha **E-mail:** `bob@fintech.com`
- Preencha **Senha:** `Senha@123`
- Clique em **Criar conta** → redirecionado para `/login`

**2.2 Obter o UUID do Bob via Swagger**
- Acesse http://localhost:3000/api/docs
- Localize o endpoint `POST /api/auth/login`
- Clique em *Try it out* e envie: `{ "email": "bob@fintech.com", "password": "Senha@123" }`
- Copie o campo `accessToken` da resposta
- Clique em *Authorize* (cadeado no topo do Swagger), cole o token no campo Bearer e confirme
- Localize o endpoint `GET /api/wallet`
- Clique em *Try it out* → *Execute*
- **Resultado esperado:** resposta com `{ "id": "uuid-da-wallet-do-bob", "balance": 0 }`

> ⚠️ **Atenção:** o campo `recipientId` na transferência é o `id` da **wallet** (não o `id` do usuário). Salve esse UUID para o Cenário 3.

---

### Cenário 3 — Fluxo Financeiro (Depósito e Transferência)

*Volte para a aba principal (logada como Alice).*

**3.1 Depósito**
- No Dashboard, clique em **Depositar**
- Preencha **Valor:** `500`
- Preencha **Descrição:** `Salário de teste`
- Clique em **Depositar**
- **Resultado esperado:** modal fecha, saldo atualiza para **R$ 500,00**. A tabela exibe 1 entrada: `Depósito / CREDIT / R$ 500,00`.

**3.2 Depósito com valor inválido (teste negativo)**
- Abra o modal de depósito novamente
- Preencha **Valor:** `0` ou valor negativo
- Clique em **Depositar**
- **Resultado esperado:** erro de validação no campo (sem fechar o modal)

**3.3 Transferência**
- No Dashboard, clique em **Transferir**
- Preencha **ID do destinatário:** cole o UUID da wallet do Bob (obtido no Cenário 2)
- Preencha **Valor:** `150`
- Preencha **Descrição:** `Pagamento de teste`
- Clique em **Transferir**
- **Resultado esperado:** modal fecha, saldo da Alice atualiza para **R$ 350,00**

**3.4 Verificar saldo do Bob após transferência**
- No Swagger (aba do Bob, autenticado), execute novamente `GET /api/wallet`
- **Resultado esperado:** `"balance": 150`

**3.5 Transferência com saldo insuficiente (teste negativo)**
- Tente transferir `R$ 9999`
- **Resultado esperado:** erro no modal "Saldo insuficiente para realizar a transferência"

**3.6 Transferência para ID inexistente (teste negativo)**
- Tente transferir com `recipientId`: `00000000-0000-0000-0000-000000000000`
- **Resultado esperado:** erro no modal "Conta destinatária não encontrada"

---

### Cenário 4 — Auditoria (Extrato / Ledger)

**4.1 Estrutura do extrato**
- A tabela exibe **2 entradas** (depósito + transferência)
- **Entrada 1:** Depósito (`DEPOSIT`) / Tipo: CREDIT (`+ R$ 500,00`) / Descrição: `Salário de teste`
- **Entrada 2:** Transferência enviada (`TRANSFER_OUT`) / Tipo: DEBIT (`- R$ 150,00`) / Descrição: `Pagamento de teste`

**4.2 Estorno de transação**
- Localize a entrada do depósito (`R$ 500,00`) e clique em **Estornar**
- **Resultado esperado:** saldo atualiza para **R$ -150,00**. Uma nova entrada do tipo `REVERSAL` é criada.
- Tente estornar a mesma transação novamente
- **Resultado esperado:** erro "Esta transação já foi estornada"

**4.3 Verificar extrato do Bob (via Swagger)**
- No Swagger do Bob, execute `GET /api/wallet`
- **Resultado esperado:** ledger contém 1 entrada: `TRANSFER_IN / CREDIT / R$ 150,00`

---

### Cenário 5 — Segurança e Sessão

**5.1 Logout**
- No Dashboard, clique em **Sair**
- **Resultado esperado:** redirecionamento para `/login`
- Tente acessar `/dashboard` diretamente → redirecionado para login

**5.2 Usuário já logado**
- Faça login novamente como Alice
- Tente acessar `/login` ou `/register`
- **Resultado esperado:** redirecionamento automático para `/dashboard`

---

### Resumo de Resultados

| Cenário | Status |
| :--- | :--- |
| 1 — Registro e Login | ✅ Passou |
| 2 — Criação do cobaia e obtenção do UUID | ✅ Passou |
| 3 — Depósito e Transferência | ✅ Passou |
| 4 — Auditoria / Ledger / Estorno | ✅ Passou |
| 5 — Segurança e Sessão | ✅ Passou |

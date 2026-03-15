# NEXOS ERP — Prompt de Construção do Módulo Financeiro (MVP v3.3)

> **Objetivo**: Este prompt contém TODAS as instruções necessárias para construir o Módulo Financeiro do Nexos ERP exatamente como especificado na documentação v3.3. Siga cada seção na ordem indicada. Não invente funcionalidades — implemente APENAS o que está descrito aqui.

---

## 0. CONTEXTO GERAL

O **Nexos ERP** é uma plataforma SaaS white-label para gestão empresarial. O sistema opera como cliente SSO do **ZonaDev Auth** (`auth.zonadev.tech`), herdando autenticação, multi-tenancy e sessões. O domínio principal é `erp.zonadev.tech`.

Este módulo é o **Módulo Financeiro** — primeiro módulo de negócio do MVP. Inclui: contas a pagar/receber, fluxo de caixa, conciliação bancária, DRE, parcelamento, régua de cobrança, fluxo de aprovação, gestão de boletos, transferências entre contas, bloqueio contábil, baixa parcial, estorno com prazo, sistema de filiais e audit trail completo.

---

## 1. STACK TECNOLÓGICA (não alterar)

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS + TypeScript + TanStack Query |
| Backend | NestJS + Drizzle ORM + TypeScript |
| Banco de dados | PostgreSQL 16 (schemas por tenant) + pgBouncer (transaction pooling) |
| Cache / Filas | Redis (Keyv + BullMQ) |
| Autenticação | ZonaDev Auth (JWT RS256 via JWKS) |
| Storage | Cloudflare R2 (S3-compatible) |
| Infra | Docker + VPS (Hostinger) |

### Bibliotecas obrigatórias

| Biblioteca | Uso | Onde |
|---|---|---|
| `decimal.js` | Toda operação monetária | Backend + Frontend |
| `class-validator` + `class-transformer` | Validação de DTOs | Backend |
| `@nestjs/throttler` | Rate limiting | Backend |
| `@nestjs/event-emitter` (EventEmitter2) | Event bus interno (cache, audit, notificações) | Backend |
| `@nestjs/cls` (AsyncLocalStorage) | Tenant context por request (sem search_path) | Backend |
| `pino` | Logs estruturados (JSON) | Backend |
| `prom-client` | Métricas Prometheus | Backend |
| `@opentelemetry/sdk-node` | Tracing distribuído | Backend |
| `opossum` | Circuit breaker para integrações externas | Backend |
| `@tanstack/react-query` | Data fetching, cache, retry, dedup | Frontend |
| `@aws-sdk/client-s3` | Upload/download R2 | Backend |
| `react-input-mask` ou `react-number-format` | Máscaras de input (CPF, CNPJ, telefone, moeda) | Frontend |

### Por que Drizzle ORM (decisão final — não mudar)
- **TypeORM descartado**: migrations instáveis, performance ruim em joins complexos, manutenção irregular
- **Prisma descartado**: limitação crítica para multi-tenant com schemas dinâmicos (precisa de PrismaClient por schema ou `$queryRaw`)
- **Drizzle escolhido**: tipagem forte, controle total de SQL, suporte nativo a schemas dinâmicos via `.withSchema()`, migrations estáveis via `drizzle-kit`, performance próxima ao SQL puro

### Por que TanStack Query no Frontend (decisão final — não mudar)
- Cache automático com invalidação inteligente
- Retry com backoff nativo
- Deduplicação de requests idênticas
- Cancelamento automático de queries obsoletas
- Stale-while-revalidate (UX fluida)
- Perfeito para ERP com muitas listagens, dashboards e formulários

### pgBouncer (obrigatório em produção)
- Modo: `transaction pooling`
- Sem pgBouncer o PostgreSQL explode com `max_connections` quando múltiplos tenants acessam simultaneamente
- Configurar `pool_size` proporcional ao número de tenants ativos

---

## 2. INTEGRAÇÃO SSO (sem tela de login)

O Nexos ERP **não possui tela de login própria**. Fluxo:

1. Usuário acessa `erp.zonadev.tech`
2. Middleware Next.js verifica cookie `access_token`
3. Sem token válido → redirect para `auth.zonadev.tech?aud=erp.zonadev.tech&redirect=/dashboard`
4. Usuário faz login no ZonaDev Auth
5. Auth emite JWT RS256 via cookie HTTP-only (`domain=.zonadev.tech`)
6. Redirect de volta para `erp.zonadev.tech`
7. Middleware valida assinatura via JWKS (cache 5min) — autenticado

### Claims do JWT

| Claim | Exemplo | Uso no ERP |
|---|---|---|
| `sub` | uuid-do-usuario | Identificar o usuário |
| `tenantId` | uuid-do-tenant | Rotear para schema correto no banco |
| `roles` | `["ADMIN"]` | Role base — complementado pelo RBAC local |
| `plan` | `PRO` | Feature flags por plano |
| `aud` | `erp.zonadev.tech` | Validação de audience |

---

## 3. MULTI-TENANCY

**Estratégia: schema por tenant** (ex: `tenant_abc123`).

- Cada empresa (tenant) possui um schema isolado no PostgreSQL
- Tabelas idênticas em todos os schemas; dados fisicamente separados
- Migrations aplicadas em todos os schemas via loop automatizado

### REGRA CRÍTICA: schema explícito via `.withSchema()` — NUNCA `SET search_path`

Com **pgBouncer em transaction pooling**, a conexão é compartilhada entre requests de tenants diferentes. Se usar `SET search_path TO tenant_x`, o path pode **vazar para o próximo request** de outro tenant — causando acesso cruzado de dados.

**Solução obrigatória**: usar sempre `.withSchema()` do Drizzle em TODA query:

```typescript
// ✅ CORRETO — schema explícito, seguro com pgBouncer
const entries = await db
  .select()
  .from(financialEntries)
  .withSchema(`tenant_${tenantId}`)
  .where(eq(financialEntries.branchId, branchId));

// ❌ PROIBIDO — search_path vaza entre conexões no pgBouncer
await db.execute(sql`SET search_path TO tenant_${tenantId}`);
```

Implementação no `TenantInterceptor`:
- Extrai `tenantId` do JWT
- Armazena no `AsyncLocalStorage` (cls-hooked ou @nestjs/cls)
- Cada repository acessa o tenantId via contexto e aplica `.withSchema()` automaticamente
- **NUNCA** usar `SET search_path` em nenhum lugar do código

---

## 4. ARQUITETURA DO BACKEND (REGRA CRÍTICA — seguir exatamente)

### 4.1 Estrutura de pastas: Feature-Based Modules

**NÃO usar** a estrutura flat (`controllers/`, `services/`, `repositories/` na raiz). Usar **módulos por feature**:

```
src/
├── common/                          # Código compartilhado entre todos os módulos
│   ├── decorators/                  # Custom decorators (@CurrentUser, @RequirePermission, @Idempotent)
│   ├── dtos/                        # DTOs base (PaginationDto, ApiResponseDto, ApiErrorDto)
│   ├── exceptions/                  # Exceções customizadas (BusinessException, LockPeriodException)
│   ├── events/                      # Eventos de domínio (EntryCreatedEvent, PaymentCreatedEvent, etc.)
│   ├── listeners/                   # Event listeners (CacheInvalidationListener, NotificationListener)
│   ├── filters/                     # Exception filters globais (AllExceptionsFilter)
│   ├── guards/                      # Guards globais (JwtGuard, RbacGuard, BranchGuard, FeatureFlagGuard)
│   ├── interceptors/                # Interceptors globais (TenantInterceptor, AuditInterceptor, LoggingInterceptor)
│   ├── middlewares/                 # Middlewares (RequestIdMiddleware)
│   ├── pipes/                       # Pipes globais (DecimalValidationPipe)
│   ├── validators/                  # Custom validators (IsDocument, IsPhone, IsCep, CPF/CNPJ digit check)
│   ├── types/                       # Types e interfaces compartilhadas
│   └── utils/                       # Utilitários (decimal helpers, date helpers)
│
├── infrastructure/                  # Camada de infraestrutura
│   ├── database/                    # Drizzle config, schema definitions, migrations, tenant context
│   ├── cache/                       # Redis config, cache service, cache keys
│   ├── queue/                       # BullMQ config, processors base
│   ├── storage/                     # R2/S3 config, upload service
│   ├── mail/                        # Email service, template renderer
│   └── health/                      # Health check endpoints
│
├── modules/                         # Módulos de negócio (feature-based)
│   ├── auth/                        # SSO integration, JWT validation
│   │   ├── auth.module.ts
│   │   ├── auth.guard.ts
│   │   └── auth.strategy.ts
│   │
│   ├── tenants/                     # Tenant management, onboarding
│   │   ├── tenants.module.ts
│   │   ├── tenants.service.ts
│   │   └── tenants.repository.ts
│   │
│   ├── branches/                    # Filiais CRUD
│   │   ├── branches.module.ts
│   │   ├── branches.controller.ts
│   │   ├── branches.service.ts
│   │   ├── branches.repository.ts
│   │   └── dto/
│   │       ├── create-branch.dto.ts
│   │       └── update-branch.dto.ts
│   │
│   ├── rbac/                        # Roles, permissions, user_roles, user_branches
│   │   ├── rbac.module.ts
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   ├── roles.repository.ts
│   │   ├── permissions.service.ts
│   │   └── dto/
│   │
│   ├── contacts/                    # Fornecedores e clientes
│   │   ├── contacts.module.ts
│   │   ├── contacts.controller.ts
│   │   ├── contacts.service.ts
│   │   ├── contacts.repository.ts
│   │   └── dto/
│   │
│   └── financial/                   # MÓDULO FINANCEIRO (subdomínios)
│       ├── financial.module.ts      # Registra todos os submodules
│       │
│       ├── entries/                  # Lançamentos financeiros (contas a pagar/receber)
│       │   ├── entries.module.ts
│       │   ├── entries.controller.ts
│       │   ├── entries.service.ts
│       │   ├── entries.repository.ts
│       │   └── dto/
│       │       ├── create-entry.dto.ts
│       │       ├── update-entry.dto.ts
│       │       ├── pay-entry.dto.ts
│       │       ├── cancel-entry.dto.ts
│       │       └── list-entries.dto.ts
│       │
│       ├── payments/                # Baixa parcial/total, estorno
│       │   ├── payments.module.ts
│       │   ├── payments.controller.ts
│       │   ├── payments.service.ts
│       │   ├── payments.repository.ts
│       │   └── dto/
│       │
│       ├── categories/              # Plano de contas
│       │   ├── categories.module.ts
│       │   ├── categories.controller.ts
│       │   ├── categories.service.ts
│       │   ├── categories.repository.ts
│       │   └── dto/
│       │
│       ├── bank-accounts/           # Contas bancárias
│       │   ├── bank-accounts.module.ts
│       │   ├── bank-accounts.controller.ts
│       │   ├── bank-accounts.service.ts
│       │   ├── bank-accounts.repository.ts
│       │   └── dto/
│       │
│       ├── reconciliation/          # Conciliação bancária
│       │   ├── reconciliation.module.ts
│       │   ├── reconciliation.controller.ts
│       │   ├── reconciliation.service.ts
│       │   ├── reconciliation.repository.ts
│       │   └── dto/
│       │
│       ├── reports/                 # DRE, balancete, fluxo de caixa, aging
│       │   ├── reports.module.ts
│       │   ├── reports.controller.ts
│       │   ├── reports.service.ts
│       │   ├── reports.repository.ts
│       │   └── dto/
│       │
│       ├── dashboard/               # Cards, gráficos, resumos
│       │   ├── dashboard.module.ts
│       │   ├── dashboard.controller.ts
│       │   ├── dashboard.service.ts
│       │   └── dashboard.repository.ts
│       │
│       ├── transfers/               # Transferências entre contas
│       │   ├── transfers.module.ts
│       │   ├── transfers.controller.ts
│       │   ├── transfers.service.ts
│       │   ├── transfers.repository.ts
│       │   └── dto/
│       │
│       ├── approvals/               # Fluxo de aprovação
│       │   ├── approvals.module.ts
│       │   ├── approvals.controller.ts
│       │   ├── approvals.service.ts
│       │   ├── approvals.repository.ts
│       │   └── dto/
│       │
│       ├── boletos/                 # Gestão de boletos via gateway
│       │   ├── boletos.module.ts
│       │   ├── boletos.controller.ts
│       │   ├── boletos.service.ts
│       │   ├── boletos.gateway-client.ts   # Circuit breaker aqui
│       │   └── dto/
│       │
│       ├── collection-rules/        # Régua de cobrança + templates
│       │   ├── collection-rules.module.ts
│       │   ├── collection-rules.controller.ts
│       │   ├── collection-rules.service.ts
│       │   ├── collection-rules.repository.ts
│       │   └── dto/
│       │
│       ├── lock-periods/            # Bloqueio contábil
│       │   ├── lock-periods.module.ts
│       │   ├── lock-periods.controller.ts
│       │   ├── lock-periods.service.ts
│       │   ├── lock-periods.repository.ts
│       │   └── dto/
│       │
│       ├── settings/                # Configurações financeiras
│       │   ├── settings.module.ts
│       │   ├── settings.controller.ts
│       │   ├── settings.service.ts
│       │   ├── settings.repository.ts
│       │   └── dto/
│       │
│       ├── audit/                   # Logs de auditoria (somente leitura)
│       │   ├── audit.module.ts
│       │   ├── audit.controller.ts
│       │   ├── audit.service.ts
│       │   └── audit.repository.ts
│       │
│       └── jobs/                    # Jobs automatizados (BullMQ processors)
│           ├── jobs.module.ts
│           ├── overdue.processor.ts
│           ├── recurrence.processor.ts
│           ├── collection.processor.ts
│           └── sequences.processor.ts
│
└── app.module.ts                    # Root module
```

### 4.2 Responsabilidades de cada camada (REGRA — não violar)

**Controller** — APENAS:
- Receber request
- Validar input via DTO (class-validator faz isso automaticamente via pipe)
- Chamar o service
- Retornar response no formato padrão

```typescript
// ✅ CORRETO — controller magro
@Post()
@RequirePermission('financial.entries.create')
async create(
  @Body() dto: CreateEntryDto,
  @CurrentUser() user: AuthUser,
  @BranchId() branchId: string,
): Promise<ApiResponse<FinancialEntryResponse>> {
  const entry = await this.entriesService.create(dto, user, branchId);
  return ApiResponse.created(entry);
}

// ❌ PROIBIDO — lógica de negócio no controller
@Post()
async create(@Body() dto: CreateEntryDto) {
  // NUNCA fazer isso no controller:
  const category = await this.categoriesRepo.findById(dto.categoryId);
  if (category.type !== 'DESPESA') throw new Error('...');
  const sequence = await this.sequencesRepo.getNext(...);
  // ... isso é responsabilidade do SERVICE
}
```

**Service** — Toda a lógica de negócio:
- Validações de regras de negócio (período bloqueado, status permitido, valor, etc.)
- Orquestração de operações (transações, chamadas a múltiplos repositories)
- Cálculos com `decimal.js`
- Emissão de eventos (audit log, filas)

**Repository** — APENAS acesso ao banco:
- Queries Drizzle (select, insert, update, delete)
- Não contém lógica de negócio
- Retorna dados brutos ou tipados

**DTO** — Validação de entrada com `class-validator`:
- Cada endpoint tem seu próprio DTO
- Validação acontece automaticamente via `ValidationPipe` global
- DTOs de saída (response) são classes separadas

### 4.3 Naming Conventions (obrigatório)

| Contexto | Convenção | Exemplo |
|---|---|---|
| Classes (services, controllers, DTOs) | PascalCase | `EntriesService`, `CreateEntryDto` |
| Arquivos | kebab-case | `entries.service.ts`, `create-entry.dto.ts` |
| Variáveis e funções | camelCase | `findByBranchId`, `paidAmount` |
| Colunas do banco (Drizzle schema) | snake_case | `branch_id`, `due_date`, `paid_amount` |
| Constantes | UPPER_SNAKE_CASE | `MAX_INSTALLMENTS`, `DEFAULT_PAGE_SIZE` |
| Enums | PascalCase (tipo) + UPPER_SNAKE_CASE (valores) | `EntryStatus.PENDING_APPROVAL` |
| Endpoints (URL) | kebab-case | `/bank-accounts`, `/lock-periods` |
| Headers customizados | X-PascalCase | `X-Branch-Id`, `Idempotency-Key` |

### 4.4 Testes obrigatórios

Todos os **services** devem ter testes unitários com **Jest**.

```typescript
// entries.service.spec.ts
describe('EntriesService', () => {
  // Testar cada regra de negócio individualmente:
  it('should reject entry with issue_date in locked period');
  it('should create with status PENDING_APPROVAL when approval rule matches');
  it('should create with status PENDING when no approval rule matches');
  it('should generate document_number atomically');
  it('should create N installments with correct due_dates');
  it('should calculate installment amounts with decimal precision');
  // Testes de precisão decimal:
  it('should handle 1000 / 3 = 333.33 + 333.33 + 333.34');
  it('should sum to exact total after many partial payments');
});
```

Regras de teste:
- Comparar valores monetários com `toBe('string')` — **NUNCA** `toBeCloseTo`
- Mock do repository (não testar banco nos unit tests)
- Incluir edge cases: valores grandes, muitas parcelas, divisões com repetição

---

## 5. PADRÕES DE API (REGRA CRÍTICA — aplicar em TODOS os endpoints)

### 5.1 Formato de Resposta Padrão

**TODA** resposta da API segue este formato. Sem exceção.

**Sucesso (item único):**
```json
{
  "data": {
    "id": "uuid",
    "documentNumber": "PAY-2026-00001",
    "amount": "1500.00",
    "status": "PENDING"
  }
}
```

**Sucesso (lista paginada):**
```json
{
  "data": [
    { "id": "uuid", "documentNumber": "PAY-2026-00001" }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 347,
    "totalPages": 18
  }
}
```

**Sucesso (sem conteúdo):**
```
HTTP 204 No Content
```

Implementar classe `ApiResponse<T>`:
```typescript
class ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;

  static ok<T>(data: T): ApiResponse<T>;
  static created<T>(data: T): ApiResponse<T>;
  static paginated<T>(data: T[], meta: PaginationMeta): ApiResponse<T[]>;
}
```

### 5.2 Formato de Erro Padrão

**TODO** erro retornado pela API segue este formato:

```json
{
  "error": {
    "code": "ENTRY_LOCKED_PERIOD",
    "message": "Este lançamento está em um período contábil bloqueado",
    "details": {
      "lockedUntil": "2026-01-31",
      "entryDate": "2026-01-15"
    },
    "requestId": "uuid-do-request"
  }
}
```

**Códigos de erro padronizados:**

| HTTP | Código | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | DTO inválido (class-validator) |
| 400 | `INVALID_BRANCH` | X-Branch-Id ausente ou inválido |
| 401 | `UNAUTHORIZED` | JWT ausente ou expirado |
| 403 | `FORBIDDEN` | Sem permissão RBAC ou sem acesso à filial |
| 404 | `NOT_FOUND` | Registro não encontrado |
| 409 | `CONFLICT` | Duplicata (idempotency key repetida com payload diferente) |
| 413 | `STORAGE_LIMIT_EXCEEDED` | Limite de storage do tenant excedido |
| 422 | `ENTRY_LOCKED_PERIOD` | Data em período bloqueado |
| 422 | `INVALID_STATUS_TRANSITION` | Transição de status não permitida |
| 422 | `REFUND_PERIOD_EXPIRED` | Prazo de estorno expirado |
| 422 | `CATEGORY_TYPE_MISMATCH` | Categoria incompatível com tipo do lançamento |
| 422 | `APPROVAL_REQUIRED` | Lançamento requer aprovação |
| 422 | `AMOUNT_EXCEEDS_REMAINING` | Valor do pagamento excede saldo restante |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limiting excedido |
| 500 | `INTERNAL_ERROR` | Erro interno (nunca vazar detalhes) |

Implementar via `AllExceptionsFilter` global + exceções customizadas:

```typescript
// Exceções de negócio
class BusinessException extends HttpException {
  constructor(code: string, message: string, details?: Record<string, any>, status = 422) {
    super({ error: { code, message, details } }, status);
  }
}

// Uso no service:
throw new BusinessException(
  'ENTRY_LOCKED_PERIOD',
  'Este lançamento está em um período contábil bloqueado',
  { lockedUntil: '2026-01-31', entryDate: '2026-01-15' }
);
```

### 5.3 Paginação Obrigatória

**TODA** listagem é paginada. Sem exceção. Query sem `LIMIT` é proibida.

**Query params padrão:**
```
?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

**DTO base de paginação:**
```typescript
class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)      // TETO: nunca mais que 100 por página
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

Regras:
- `pageSize` default: 20, máximo: 100
- Toda listagem retorna `meta` com `page`, `pageSize`, `total`, `totalPages`
- Repository usa `LIMIT` + `OFFSET` (ou cursor-based para tabelas muito grandes)
- `sortBy` aceita apenas colunas pré-definidas por endpoint (whitelist) — nunca aceitar input raw

### 5.4 Query Timeout

**TODA** query ao PostgreSQL tem timeout de 5 segundos.

```typescript
// Configurar no Drizzle/pg:
statement_timeout: '5000'  // 5 segundos
```

Se a query exceder, retorna `500` com log de alerta. Isso evita queries lentas travando conexões do pool.

### 5.5 Limite de Payload

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

// Limite global de request body
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ limit: '10mb', extended: true }));
```

Upload de arquivos: max 10MB por arquivo, via presigned URL (não passa pelo backend).

### 5.6 Validação com class-validator (obrigatório em todo DTO)

```typescript
// create-entry.dto.ts
export class CreateEntryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description: string;

  @IsEnum(EntryType)
  type: EntryType;

  @IsString()
  @Matches(/^\d+\.\d{2}$/, { message: 'Amount must be a string with exactly 2 decimal places' })
  amount: string;  // SEMPRE string para valores monetários

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  installment?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(120)
  installmentCount?: number;

  @IsOptional()
  @IsEnum(Frequency)
  installmentFrequency?: Frequency;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
```

Regras:
- Valores monetários são **SEMPRE** `string` nos DTOs (nunca `number`)
- `@Matches(/^\d+\.\d{2}$/)` garante formato correto (`"1500.00"`)
- `whitelist: true` + `forbidNonWhitelisted: true` rejeita campos extras
- Cada endpoint tem seu próprio DTO — não reutilizar DTOs entre endpoints diferentes

### 5.7 Formatação e Validação de Campos Padronizados (REGRA CRÍTICA)

Todos os campos de documento, telefone e CEP devem ser **armazenados formatados** no banco e **validados com regex** nos DTOs. O frontend exibe e envia sempre formatado. O backend valida o formato no DTO e armazena como recebeu.

#### Regras por tipo de campo

| Campo | Formato armazenado | Regex de validação | Máscara frontend | Exemplo |
|---|---|---|---|---|
| CPF | `000.000.000-00` | `/^\d{3}\.\d{3}\.\d{3}-\d{2}$/` | `999.999.999-99` | `123.456.789-00` |
| CNPJ | `00.000.000/0000-00` | `/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/` | `99.999.999/9999-99` | `12.345.678/0001-90` |
| CPF ou CNPJ | Detectar pelo tamanho | CPF: 14 chars, CNPJ: 18 chars | Dinâmica | — |
| Telefone | `(00) 00000-0000` | `/^\(\d{2}\) \d{4,5}-\d{4}$/` | `(99) 99999-9999` | `(11) 98765-4321` |
| CEP | `00000-000` | `/^\d{5}-\d{3}$/` | `99999-999` | `01310-100` |
| UF | `XX` (maiúsculo) | `/^[A-Z]{2}$/` | Uppercase auto | `SP` |
| Valor monetário | `"1500.00"` (string) | `/^\d+\.\d{2}$/` | Centavos como inteiro | `R$ 1.500,00` |
| Data | `YYYY-MM-DD` (ISO) | `@IsDateString()` | `DD/MM/YYYY` no frontend | `2026-03-15` |

#### Validação no DTO (backend)

```typescript
// Decorator customizado para CPF/CNPJ
export function IsDocument() {
  return applyDecorators(
    IsString(),
    Matches(
      /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/,
      { message: 'Documento deve ser CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)' }
    ),
  );
}

// Decorator customizado para telefone
export function IsPhone() {
  return applyDecorators(
    IsString(),
    Matches(
      /^\(\d{2}\) \d{4,5}-\d{4}$/,
      { message: 'Telefone deve estar no formato (00) 00000-0000' }
    ),
  );
}

// Decorator customizado para CEP
export function IsCep() {
  return applyDecorators(
    IsString(),
    Matches(/^\d{5}-\d{3}$/, { message: 'CEP deve estar no formato 00000-000' }),
  );
}

// Uso no DTO:
export class CreateContactDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsEnum(ContactType)
  type: ContactType;

  @IsOptional()
  @IsDocument()
  document?: string;  // "123.456.789-00" ou "12.345.678/0001-90"

  @IsOptional()
  @IsPhone()
  phone?: string;     // "(11) 98765-4321"

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: 'CNPJ inválido' })
  document?: string;  // Filial só aceita CNPJ

  @IsOptional()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsCep()
  addressZip?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve ter 2 letras maiúsculas' })
  addressState?: string;
}
```

#### Validação de dígito verificador (CPF/CNPJ)

Além do formato, **validar o dígito verificador** no backend:

```typescript
// utils/document-validator.ts
export function isValidCpf(cpf: string): boolean {
  // Remove formatação para calcular
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Rejeita CPFs com todos os dígitos iguais (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  // Algoritmo de validação dos 2 dígitos verificadores
  // ... (implementar cálculo padrão)
  return true;
}

export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  // Algoritmo de validação dos 2 dígitos verificadores
  // ... (implementar cálculo padrão)
  return true;
}

// Custom validator para class-validator:
@ValidatorConstraint({ name: 'isValidDocument', async: false })
export class IsValidDocumentConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return true; // @IsOptional cuida de nullable
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 ? isValidCpf(value) : isValidCnpj(value);
  }
  defaultMessage() { return 'CPF ou CNPJ inválido (dígito verificador incorreto)'; }
}
```

#### Máscara no Frontend

```typescript
// components/ui/masked-input.tsx — usar react-input-mask ou react-number-format
// CPF: máscara 999.999.999-99
// CNPJ: máscara 99.999.999/9999-99
// Telefone: máscara (99) 99999-9999
// CEP: máscara 99999-999
// Valor monetário: react-number-format com centavos (150000 → "R$ 1.500,00" → envia "1500.00")

// Componente inteligente que detecta CPF/CNPJ pelo tamanho:
<DocumentInput
  value={document}
  onChange={setDocument}
  // Até 11 dígitos: aplica máscara CPF
  // Acima de 11: aplica máscara CNPJ
/>
```

#### Resumo: fluxo completo de um campo formatado

```
Usuário digita: 12345678000190
→ Frontend aplica máscara: 12.345.678/0001-90
→ Envia para API: "12.345.678/0001-90"
→ DTO valida: regex ✅ + dígito verificador ✅
→ Banco armazena: "12.345.678/0001-90"
→ API retorna: "12.345.678/0001-90"
→ Frontend exibe: 12.345.678/0001-90
```

---

## 6. CACHE LAYER (obrigatório)

### 6.1 Cache de Leitura para Endpoints Pesados

| Endpoint | Cache Key | TTL | Invalidado por eventos |
|---|---|---|---|
| `GET /dashboard/summary` | `dashboard:summary:{tenantId}:{branchId}` | 60s | `entry.created`, `payment.created`, `entry.cancelled` |
| `GET /dashboard/cashflow-chart` | `dashboard:cashflow:{tenantId}:{branchId}:{period}` | 60s | `entry.created`, `payment.created`, `entry.cancelled` |
| `GET /dashboard/overdue` | `dashboard:overdue:{tenantId}:{branchId}` | 60s | `payment.created`, `overdue.updated` |
| `GET /reports/dre` | `reports:dre:{tenantId}:{branchId}:{startDate}:{endDate}` | 300s | `payment.created`, `entry.cancelled` |
| `GET /reports/cashflow` | `reports:cashflow:{tenantId}:{branchId}:{startDate}:{endDate}` | 300s | `payment.created`, `entry.cancelled`, `transfer.created` |
| `GET /reports/balance-sheet` | `reports:balance:{tenantId}:{branchId}:{startDate}:{endDate}` | 300s | `payment.created`, `entry.cancelled` |
| Permissões RBAC | `rbac:{tenantId}:{userId}` | 300s | `role.updated`, `user_role.changed` |
| Feature flags | `features:{tenantId}` | 300s | `plan.changed` |

### 6.2 Invalidação via Event Bus (NÃO usar `invalidatePattern`)

**NUNCA usar `invalidatePattern` ou `KEYS *` no Redis** — isso faz scan em todas as keys e vira gargalo com muitos tenants.

Usar **event-driven cache invalidation** via NestJS `EventEmitter2`:

```typescript
// common/events/financial.events.ts
export class EntryCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly entryId: string,
    public readonly type: EntryType,
  ) {}
}

export class PaymentCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly entryId: string,
    public readonly amount: string,
  ) {}
}

export class EntryCancelledEvent { /* ... */ }
export class TransferCreatedEvent { /* ... */ }
export class OverdueUpdatedEvent { /* ... */ }

// payments.service.ts — quem EMITE o evento
async registerPayment(dto: PayEntryDto, user: AuthUser, branchId: string) {
  // ... lógica de pagamento ...
  // Emite evento — NÃO invalida cache diretamente
  this.eventEmitter.emit('payment.created', new PaymentCreatedEvent(tenantId, branchId, entryId, dto.amount));
}

// common/listeners/cache-invalidation.listener.ts — quem ESCUTA e invalida
@Injectable()
export class CacheInvalidationListener {
  @OnEvent('payment.created')
  async handlePaymentCreated(event: PaymentCreatedEvent) {
    // Invalida keys EXATAS — sem pattern scan
    await this.cache.del(`dashboard:summary:${event.tenantId}:${event.branchId}`);
    await this.cache.del(`dashboard:cashflow:${event.tenantId}:${event.branchId}:*`);
    await this.cache.del(`dashboard:overdue:${event.tenantId}:${event.branchId}`);
    // Reports: invalida apenas se existir (cache.del em key inexistente é no-op)
    // Não precisa de KEYS scan
  }

  @OnEvent('entry.created')
  async handleEntryCreated(event: EntryCreatedEvent) {
    await this.cache.del(`dashboard:summary:${event.tenantId}:${event.branchId}`);
  }
}
```

**Vantagens sobre `invalidatePattern`**:
- Sem `KEYS *` no Redis (O(N) bloqueante em produção)
- Cada listener sabe exatamente quais keys invalidar
- Desacoplamento: service emite evento, listener cuida do cache
- Mesmo event bus alimenta: cache, audit, notificações, filas de e-mail

### 6.3 Decorator para Cache (leitura)

```typescript
// Decorator customizado para cache no service
@CacheResult({ keyPrefix: 'dashboard:summary', ttl: 60 })
async getSummary(tenantId: string, branchId: string): Promise<DashboardSummary> {
  // query pesada aqui — só executa se cache miss
}
```

---

## 7. RESILIÊNCIA PARA INTEGRAÇÕES EXTERNAS

### 7.1 Circuit Breaker (opossum)

Toda integração externa usa circuit breaker:

```typescript
// boletos.gateway-client.ts
import CircuitBreaker from 'opossum';

const breakerOptions = {
  timeout: 10000,        // 10s timeout por request
  errorThresholdPercentage: 50,  // abre circuito se 50% falhar
  resetTimeout: 30000,   // tenta fechar após 30s
};

this.generateBreaker = new CircuitBreaker(
  (entryId: string) => this.httpClient.post(`${gatewayUrl}/boletos`, { entryId }),
  breakerOptions,
);

// Fallback quando circuito aberto
this.generateBreaker.fallback(() => {
  throw new BusinessException('GATEWAY_UNAVAILABLE', 'Serviço de boletos indisponível. Tente novamente em instantes.');
});
```

Integrações protegidas com circuit breaker:
- Gateway de boletos (Asaas, Efi, Iugu)
- Envio de e-mail (SMTP/SES)
- Upload/download R2 (presigned URLs)

### 7.2 Retry com Exponential Backoff

Chamadas externas usam retry automático:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 8. EVENT BUS INTERNO (obrigatório)

O sistema usa **NestJS EventEmitter2** como event bus interno para desacoplar side effects. Services emitem eventos, listeners reagem.

### 8.1 Eventos do domínio financeiro

```typescript
// Eventos que DEVEM ser emitidos (sem exceção):
'entry.created'       // Ao criar lançamento (inclui parcelado — 1 evento por parcela)
'entry.updated'       // Ao editar lançamento
'entry.cancelled'     // Ao cancelar lançamento
'entry.deleted'       // Ao soft-deletar lançamento
'entry.restored'      // Ao restaurar lançamento (ADMIN)
'payment.created'     // Ao registrar pagamento (baixa)
'payment.refunded'    // Ao estornar pagamento
'entry.approved'      // Ao aprovar lançamento
'entry.rejected'      // Ao rejeitar lançamento
'transfer.created'    // Ao criar transferência entre contas
'reconciliation.matched'  // Ao confirmar match de conciliação
'overdue.updated'     // Job diário marca entries como OVERDUE
'role.updated'        // Ao alterar role/permissions
'user_role.changed'   // Ao vincular/desvincular role de usuário
'plan.changed'        // Ao alterar plano do tenant
```

### 8.2 Listeners que reagem aos eventos

| Listener | Escuta | O que faz |
|---|---|---|
| `CacheInvalidationListener` | `entry.*`, `payment.*`, `transfer.*`, `role.*` | Invalida cache keys exatas (seção 6) |
| `AuditLogListener` | Todos os eventos `entry.*`, `payment.*`, `transfer.*` | Grava em `audit_logs` (append-only) |
| `NotificationListener` | `entry.approved`, `entry.rejected`, `payment.created` | Enfileira notificação/e-mail via BullMQ |
| `CollectionRuleListener` | `payment.created` | Verifica regra ON_PAYMENT e envia e-mail de agradecimento |

### 8.3 Regras do Event Bus

- Eventos são **fire-and-forget síncrono** (in-process, via EventEmitter2)
- Se um listener falha, **NÃO** deve impedir a operação principal (try-catch dentro de cada listener)
- Para side effects que precisam de garantia de entrega (e-mail, webhook), o listener enfileira no **BullMQ** — não processa diretamente
- O `AuditLogListener` é a **ÚNICA exceção**: se falhar, loga erro crítico mas não bloqueia (audit é append-only, pode ser reconciliado depois)

---

## 9. FRONTEND — PADRÕES OBRIGATÓRIOS

### 9.1 TanStack Query como Data Layer

**TODA** chamada à API usa TanStack Query. Nenhum `fetch` ou `axios` direto nos componentes.

```typescript
// hooks/use-entries.ts
export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: ['entries', filters],
    queryFn: ({ signal }) => entriesApi.list(filters, { signal }), // AbortController automático
    staleTime: 30_000,       // 30s antes de considerar stale
    placeholderData: keepPreviousData,  // mantém dados anteriores enquanto carrega
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEntryDto) => entriesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Lançamento criado com sucesso');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

### 9.2 Estados de UI obrigatórios

Todo componente que faz fetch **DEVE** ter 3 estados visuais:

```typescript
// ✅ CORRETO — sempre 3 estados
const { data, isLoading, isError, error } = useEntries(filters);

if (isLoading) return <TableSkeleton rows={10} />;     // Skeleton, não spinner
if (isError) return <ErrorBanner message={error.message} onRetry={refetch} />;
if (!data?.data.length) return <EmptyState message="Nenhum lançamento encontrado" />;

return <EntriesTable entries={data.data} />;
```

### 9.3 API Client centralizado

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl = '/api/v1';

  async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const branchId = getBranchIdFromCookie(); // filial ativa

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Branch-Id': branchId,
        ...options?.headers,
      },
      credentials: 'include', // envia cookie do JWT
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message, error.error.details);
    }

    return response.json();
  }
}
```

---

## 10. REGRAS GLOBAIS OBRIGATÓRIAS

### 10.1 Soft Delete Global

**Nenhum registro financeiro é fisicamente excluído.** Todas as entidades financeiras possuem `deleted_at` (TIMESTAMP, nullable).

- Exclusão → preenche `deleted_at` com `NOW()`
- Queries padrão filtram `deleted_at IS NULL` via where clause global no Drizzle
- Registros deletados permanecem acessíveis para auditoria
- ADMIN pode restaurar (seta `deleted_at` para NULL)
- Entidades com soft delete: `financial_entries`, `contacts`, `categories`, `bank_accounts`, `recurrences`, `attachments`

### 10.2 Numeração de Documentos

Todo lançamento financeiro recebe um código legível único por **filial**, gerado automaticamente.

**Formato**: `[TIPO]-[ANO]-[SEQUENCIAL_5_DIGITOS]`
- Contas a pagar: `PAY-2026-00001`, `PAY-2026-00002`...
- Contas a receber: `REC-2026-00001`, `REC-2026-00002`...

Sequência reinicia a cada ano. Implementado via tabela `document_sequences` com lock por filial + tipo (SELECT FOR UPDATE).

### 10.3 Precisão Decimal (REGRA CRÍTICA — aplicar em TODO o projeto)

O tipo `number` do JavaScript é float IEEE 754 → causa erros de arredondamento. **Exemplo: `0.1 + 0.2 = 0.30000000000000004`**.

#### Backend (NestJS)
- Usar `decimal.js` para **TODA** operação matemática com valores monetários
- **NUNCA** usar operadores nativos (`+`, `-`, `*`, `/`) com valores financeiros
- Valores chegam do banco como `string` via Drizzle (custom type com `mapFromDriverValue`)
- Valores retornados para o frontend como **string com 2 casas decimais** (ex: `"1500.00"`)
- Exemplo: `new Decimal(entry.amount).plus(new Decimal(entry.fees)).toFixed(2)`

#### Frontend (Next.js)
- Valores monetários são **SEMPRE strings** — nunca converter para `number` para calcular
- Exibição: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Se precisar calcular no frontend, usar `decimal.js` também
- Inputs de valor: máscara monetária que trabalha com centavos como inteiro (ex: `150000 = R$ 1.500,00`)

#### Banco de Dados
- Todas as colunas monetárias: `DECIMAL(15,2)` — **sem exceção**
- **NUNCA** usar `FLOAT` ou `REAL` para valores monetários
- Preferir agregar no banco (`SUM`, `AVG`) quando possível

#### Testes
- `expect(result).toBe('0.30')` — **NUNCA** `expect(result).toBeCloseTo(0.3)`
- Incluir edge cases: valores grandes (`999999999.99`), muitas parcelas somadas, divisões com repetição (`1000 / 3 = 333.33 + 333.33 + 333.34`)

### 10.4 Audit Trail Obrigatório

**TODA** alteração em dados financeiros gera registro em `audit_logs`. Sem exceção. A tabela é **append-only** — nunca editada ou deletada. Retenção mínima: **5 anos**.

---

## 11. SISTEMA DE FILIAIS (BRANCHES)

Empresas podem ter múltiplas filiais (lojas, unidades, CNPJs). Cada filial opera como contexto isolado de dados financeiros dentro do mesmo tenant.

### Conceito
- Filial = unidade operacional (ex: Loja Centro, Loja Shopping, Escritório SP)
- Todo tenant começa com 1 filial padrão (Matriz) criada no onboarding
- Usuário vinculado a uma ou mais filiais. Admin acessa todas automaticamente
- Trocar de filial muda **TODO** o contexto: lançamentos, categorias, contas bancárias, relatórios, dashboard

### Escopo por filial vs por tenant

**Por Filial:** categorias (plano de contas), contas bancárias, lançamentos financeiros, conciliação bancária, numeração de documentos, configurações financeiras, relatórios e dashboard

**Por Tenant:** filiais (branches), usuários e roles, contatos (fornecedores/clientes), permissões

### Branch Switcher (UI)
- No header, ao lado do nome do usuário
- Dropdown com filiais acessíveis (query em `user_branches`)
- Filial ativa salva em cookie/localStorage
- Ao trocar: frontend refaz todas as queries com novo `branch_id` (TanStack Query invalida tudo)
- Backend recebe `branch_id` via header customizado: `X-Branch-Id`
- Guard valida acesso do usuário à filial via `user_branches`
- Se `branch_id` não enviado ou inválido → `400 Bad Request`

---

## 12. CONTROLE DE ACESSO (RBAC GRANULAR)

O ZonaDev Auth fornece roles básicas no JWT (`ADMIN`, `USER`). O Nexos ERP implementa RBAC granular **interno** com permissões por módulo, armazenado no schema do tenant.

### 12.1 Tabelas de RBAC (5 tabelas)

**`roles`**: `name` VARCHAR(50) NOT NULL, `description` VARCHAR(200) NULL, `is_system` BOOLEAN NOT NULL (true = não pode ser excluído), `deleted_at` TIMESTAMP NULL

**`permissions`**: `code` VARCHAR(100) NOT NULL UNIQUE, `module` VARCHAR(50) NOT NULL, `description` VARCHAR(200) NOT NULL. Index: UNIQUE(code), INDEX(module)

**`role_permissions`**: `role_id` UUID FK NOT NULL, `permission_id` UUID FK NOT NULL. Index: UNIQUE(role_id, permission_id)

**`user_roles`**: `user_id` UUID NOT NULL (sub do JWT), `role_id` UUID FK NOT NULL. Index: UNIQUE(user_id, role_id), INDEX(user_id)

**`user_branches`**: `user_id` UUID NOT NULL, `branch_id` UUID FK NOT NULL. Index: UNIQUE(user_id, branch_id), INDEX(user_id), INDEX(branch_id)

### 12.2 Permissões do Módulo Financeiro

```
financial.dashboard.view          — Ver dashboard financeiro
financial.entries.view            — Listar e ver detalhes de lançamentos
financial.entries.create          — Criar novos lançamentos
financial.entries.edit            — Editar lançamentos pendentes
financial.entries.pay             — Registrar pagamento/recebimento (baixa)
financial.entries.cancel          — Cancelar lançamentos
financial.entries.delete          — Excluir lançamentos (soft delete)
financial.categories.view         — Ver categorias do plano de contas
financial.categories.manage       — Criar, editar, desativar categorias
financial.reconciliation.execute  — Importar extrato e conciliar
financial.reports.view            — Ver relatórios (DRE, balancete, fluxo de caixa)
financial.reports.export          — Exportar relatórios (PDF, CSV)
financial.settings.manage         — Configurações do módulo financeiro
financial.audit.view              — Ver logs de auditoria financeira
financial.bank_accounts.manage    — Gerenciar contas bancárias
financial.entries.approve         — Aprovar ou rejeitar lançamentos
financial.approval_rules.manage   — Configurar regras de aprovação
admin.branches.manage             — Criar, editar, desativar filiais (ADMIN only)
admin.users.manage                — Vincular usuários a filiais e atribuir roles (ADMIN only)
```

### 12.3 Roles Padrão (criadas no onboarding)

- **Admin**: Todas as permissões + acesso a todas as filiais automaticamente
- **Financeiro**: dashboard.view, entries.*, reconciliation.execute, reports.*, categories.view
- **Vendas**: dashboard.view, entries.view (RECEIVABLE), entries.create (RECEIVABLE)
- **Auditor**: dashboard.view, entries.view, reports.view, audit.view (SOMENTE LEITURA)

### 12.4 Fluxo de Verificação (cada request)

1. JWT chega com `sub` (user_id) e `tenantId`
2. Guard consulta `user_roles` + `role_permissions` (**cache Redis 5min**)
3. Verifica permission necessária para o endpoint
4. Guard de filial: extrai `branch_id` do header `X-Branch-Id`, valida acesso via `user_branches`
5. Permission OK + Branch OK → permite acesso. Caso contrário → `403 Forbidden`

---

## 13. MODELO DE DADOS COMPLETO

Campos padrão em TODAS as entidades: `id` (UUID PK, default `gen_random_uuid()`), `created_at` (TIMESTAMP, default `NOW()`), `updated_at` (TIMESTAMP, auto-update). Entidades financeiras também possuem `deleted_at`.

### 13.1 `branches`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| name | VARCHAR(100) | N | Nome da filial |
| legal_name | VARCHAR(200) | S | Razão social |
| document | VARCHAR(18) | S | CNPJ formatado |
| phone | VARCHAR(20) | S | Telefone |
| email | VARCHAR(255) | S | E-mail |
| address_street | VARCHAR(200) | S | Logradouro |
| address_number | VARCHAR(20) | S | Número |
| address_complement | VARCHAR(100) | S | Complemento |
| address_neighborhood | VARCHAR(100) | S | Bairro |
| address_city | VARCHAR(100) | S | Cidade |
| address_state | VARCHAR(2) | S | UF |
| address_zip | VARCHAR(10) | S | CEP |
| is_headquarters | BOOLEAN | N | True = matriz (apenas uma por tenant) |
| active | BOOLEAN | N | Default true |
| deleted_at | TIMESTAMP | S | Soft delete |

Índices: `INDEX(active)`, `UNIQUE(document) WHERE document IS NOT NULL AND deleted_at IS NULL`

### 13.2 `categories`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| name | VARCHAR(100) | N | Nome da categoria |
| type | ENUM | N | `RECEITA` ou `DESPESA` |
| parent_id | UUID FK | S | Hierarquia (max 3 níveis) |
| color | VARCHAR(7) | S | Cor hex (#FF5733) |
| active | BOOLEAN | N | Default true |
| sort_order | INTEGER | N | Ordem de exibição |
| deleted_at | TIMESTAMP | S | Soft delete |

Índices: `UNIQUE(branch_id, name, parent_id) WHERE deleted_at IS NULL`, `UNIQUE(id, branch_id)` para FK composta, `INDEX(branch_id, type)`, `INDEX(active)`

### 13.3 `contacts`

Tabela unificada de fornecedores e clientes. **Nível tenant** (compartilhada entre filiais).

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| name | VARCHAR(200) | N | Nome/razão social |
| type | ENUM | N | `FORNECEDOR`, `CLIENTE`, `AMBOS` |
| document | VARCHAR(18) | S | CPF ou CNPJ |
| email | VARCHAR(255) | S | E-mail |
| phone | VARCHAR(20) | S | Telefone |
| active | BOOLEAN | N | Default true |
| deleted_at | TIMESTAMP | S | Soft delete |

Índices: `INDEX(type)`, `INDEX(document)`, `INDEX(name)`

### 13.4 `bank_accounts`

Por filial. Cada CNPJ/loja tem suas próprias contas.

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| name | VARCHAR(100) | N | Nome descritivo |
| bank_code | VARCHAR(10) | S | Código do banco (ex: 341) |
| agency | VARCHAR(10) | S | Agência |
| account_number | VARCHAR(20) | S | Conta com dígito |
| type | ENUM | N | `CORRENTE`, `POUPANCA`, `INVESTIMENTO`, `CAIXA` |
| initial_balance | DECIMAL(15,2) | N | Default 0.00 |
| active | BOOLEAN | N | Default true |
| deleted_at | TIMESTAMP | S | Soft delete |

Índices: `INDEX(branch_id, active)`, `UNIQUE(id, branch_id)` para FK composta

### 13.5 `document_sequences`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| type | ENUM | N | `PAYABLE` ou `RECEIVABLE` |
| year | INTEGER | N | Ano da sequência |
| last_number | INTEGER | N | Último número emitido (default 0) |

Índice: `UNIQUE(branch_id, type, year)`. Operação: `SELECT ... FOR UPDATE` + increment atômico.

**Regra de performance do lock**: a transação de criação deve conter APENAS: (1) gerar document_number, (2) inserir financial_entry, (3) inserir audit_log. Upload de anexos: ANTES ou DEPOIS da transação. E-mail/notificação: FORA da transação, via BullMQ. **Meta: transação < 50ms**.

**Evolução para alto volume (fase 2)**: se uma filial tiver volume muito alto de lançamentos (ex: +1000/dia) e o `SELECT FOR UPDATE` gerar fila perceptível, migrar para **PostgreSQL sequences nativas**:
```sql
CREATE SEQUENCE tenant_abc.seq_pay_2026_branch_xyz START 1;
SELECT nextval('tenant_abc.seq_pay_2026_branch_xyz');
```
Sequences nativas são mais rápidas que table lock porque usam lock leve interno do PG. A solução com tabela é válida e suficiente para o MVP — só otimizar se medir gargalo real.

### 13.6 `financial_entries` (TABELA CENTRAL)

Contas a pagar e receber são a mesma entidade, diferenciadas por `type`.

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| document_number | VARCHAR(20) | N | Código legível (ex: PAY-2026-00045) |
| type | ENUM | N | `PAYABLE` ou `RECEIVABLE` |
| description | VARCHAR(200) | N | Descrição do lançamento |
| amount | DECIMAL(15,2) | N | Valor original (sempre positivo) |
| issue_date | DATE | N | Data de emissão/competência |
| due_date | DATE | N | Data de vencimento |
| paid_date | DATE | S | Data do pagamento efetivo |
| paid_amount | DECIMAL(15,2) | S | Valor efetivamente pago |
| status | ENUM | N | `DRAFT`, `PENDING_APPROVAL`, `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED` |
| category_id | UUID FK | N | FK composta (category_id, branch_id) → categories(id, branch_id) |
| contact_id | UUID FK | S | FK → contacts (nível tenant) |
| bank_account_id | UUID FK | S | FK composta (bank_account_id, branch_id) → bank_accounts(id, branch_id) |
| payment_method | ENUM | S | `BOLETO`, `PIX`, `TRANSFER`, `CARD`, `CASH`, `OTHER` |
| recurrence_id | UUID FK | S | FK → recurrences |
| installment_number | INTEGER | S | Número da parcela |
| installment_total | INTEGER | S | Total de parcelas |
| notes | TEXT | S | Observações |
| reconciled | BOOLEAN | N | Default false |
| created_by | UUID | N | sub do JWT |
| deleted_at | TIMESTAMP | S | Soft delete |

Índices:
- `UNIQUE(branch_id, document_number) WHERE deleted_at IS NULL`
- `INDEX(branch_id, type, status)`
- `INDEX(branch_id, due_date)`
- `INDEX(branch_id, status, due_date)`
- `INDEX(branch_id, created_at)`
- `INDEX(branch_id, contact_id)`
- `INDEX(branch_id, category_id)`
- `INDEX(branch_id, type, due_date)`

**FK Composta (integridade de filial no nível do banco)**:
- `categories` tem `UNIQUE(id, branch_id)`
- `bank_accounts` tem `UNIQUE(id, branch_id)`
- `financial_entries` FK: `(category_id, branch_id) REFERENCES categories(id, branch_id)`
- `financial_entries` FK: `(bank_account_id, branch_id) REFERENCES bank_accounts(id, branch_id)`

Isso torna **impossível** no nível do banco vincular categoria da Filial A a lançamento da Filial B.

### 13.7 `recurrences`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| description | VARCHAR(200) | N | Descrição base |
| frequency | ENUM | N | `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `YEARLY` |
| amount | DECIMAL(15,2) | N | Valor de cada parcela |
| total_installments | INTEGER | S | Total de parcelas (NULL = indefinido) |
| generated_count | INTEGER | N | Default 0 |
| next_due_date | DATE | S | Próximo vencimento |
| active | BOOLEAN | N | Pode ser desativado |
| deleted_at | TIMESTAMP | S | Soft delete |

### 13.8 `bank_statements`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| bank_account_id | UUID FK | N | Conta bancária de origem |
| transaction_date | DATE | N | Data no extrato |
| description | VARCHAR(300) | N | Descrição original do banco |
| amount | DECIMAL(15,2) | N | Positivo = crédito, negativo = débito |
| transaction_hash | VARCHAR(64) | N | SHA-256 de (date + amount + normalized_description) |
| reconciliation_status | ENUM | N | `UNMATCHED`, `SUGGESTED`, `RECONCILED`, `DIVERGENT` |
| matched_entry_id | UUID FK | S | FK → financial_entries |
| import_batch_id | UUID | N | ID do lote de importação |

Índices: `INDEX(bank_account_id, transaction_date)`, `UNIQUE(transaction_hash)`

Normalização do hash: lowercase, remover espaços extras, remover prefixos bancários (`PIX RECEBIDO - `, `TED - `).

### 13.9 `attachments`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| entry_id | UUID FK | N | FK → financial_entries |
| filename | VARCHAR(255) | N | Nome original |
| storage_key | VARCHAR(500) | N | Caminho no R2 (tenant_abc/branch_xyz/uuid.pdf) |
| mime_type | VARCHAR(100) | N | PDF, JPEG, PNG |
| size_bytes | INTEGER | N | Max 10MB |
| uploaded_by | UUID | N | sub do JWT |
| deleted_at | TIMESTAMP | S | Soft delete |

### 13.10 `audit_logs` (append-only)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | S | Filial (null para ações de nível tenant) |
| user_id | UUID | N | sub do JWT |
| user_email | VARCHAR(255) | N | Desnormalizado para histórico |
| action | ENUM | N | `CREATE`, `UPDATE`, `DELETE`, `PAY`, `CANCEL`, `RECONCILE`, `RESTORE` |
| entity | VARCHAR(50) | N | Nome da tabela |
| entity_id | UUID | N | ID do registro afetado |
| field_changes | JSONB | S | `[{field, old_value, new_value}]` |
| metadata | JSONB | S | IP, user-agent, motivo |
| ip_address | VARCHAR(45) | S | IPv4 ou IPv6 |
| request_id | UUID | S | ID único do request HTTP |

Índices: `INDEX(branch_id, entity, entity_id)`, `INDEX(user_id)`, `INDEX(created_at)`, `INDEX(action)`, `INDEX(request_id)`

### 13.11 `financial_settings` (1 por filial)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | UNIQUE |
| closing_day | INTEGER | N | 1-28, default 1 |
| currency | VARCHAR(3) | N | ISO 4217, default `BRL` |
| alert_days_before | INTEGER | N | Default 3 |
| email_alerts | BOOLEAN | N | Default true |
| max_refund_days_payable | INTEGER | N | Default 90 |
| max_refund_days_receivable | INTEGER | N | Default 180 |

### 13.12 `collection_rules` (régua de cobrança)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| event | ENUM | N | `BEFORE_DUE`, `ON_DUE`, `AFTER_DUE`, `ON_PAYMENT` |
| days_offset | INTEGER | N | Dias antes/após o evento |
| email_template_id | UUID FK | N | FK → email_templates |
| active | BOOLEAN | N | Default true |
| sort_order | INTEGER | N | Ordem de execução |

Índices: `INDEX(branch_id, active)`, `UNIQUE(branch_id, event, days_offset)`

### 13.13 `email_templates`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| name | VARCHAR(100) | N | Nome do template |
| subject | VARCHAR(200) | N | Assunto (aceita variáveis) |
| body_html | TEXT | N | Corpo HTML com variáveis |
| body_text | TEXT | N | Corpo texto puro (fallback) |
| type | ENUM | N | `BEFORE_DUE`, `ON_DUE`, `AFTER_DUE`, `ON_PAYMENT` |

Variáveis: `{{nome_cliente}}`, `{{documento}}`, `{{valor}}`, `{{vencimento}}`, `{{dias_atraso}}`, `{{link_boleto}}`, `{{nome_empresa}}`

### 13.14 `financial_entry_payments` (baixa parcial)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| entry_id | UUID FK | N | FK → financial_entries |
| amount | DECIMAL(15,2) | N | Valor deste pagamento |
| payment_date | DATE | N | Data do pagamento |
| payment_method | ENUM | S | BOLETO, PIX, TRANSFER, CARD, CASH, OTHER |
| bank_account_id | UUID FK | S | FK → bank_accounts |
| notes | TEXT | S | Observação |
| created_by | UUID | N | sub do JWT |

Índice: `INDEX(entry_id)`, `INDEX(branch_id, type, paid_date)` (para DRE)

### 13.15 `financial_lock_periods` (bloqueio contábil)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| locked_until | DATE | N | Lançamentos com data <= esta estão bloqueados |
| locked_by | UUID | N | Admin que fez o fechamento |
| reason | VARCHAR(200) | S | Motivo |

Apenas o registro mais recente por filial é ativo. Validação antes de criar/editar/cancelar/estornar: se data em período bloqueado → `422 Unprocessable Entity`.

### 13.16 `account_transfers`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| from_account_id | UUID FK | N | Conta origem |
| to_account_id | UUID FK | N | Conta destino |
| amount | DECIMAL(15,2) | N | Valor > 0 |
| transfer_date | DATE | N | Data |
| description | VARCHAR(200) | S | Descrição |
| created_by | UUID | N | sub do JWT |

Regra: contas no mesmo branch_id, não podem ser iguais. Não afeta DRE.

### 13.17 `approval_rules`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| branch_id | UUID FK | N | FK → branches |
| entry_type | ENUM | S | PAYABLE, RECEIVABLE ou NULL (ambos) |
| min_amount | DECIMAL(15,2) | N | Valor mínimo para exigir aprovação |
| approver_role_id | UUID FK | N | FK → roles |
| active | BOOLEAN | N | Default true |

### 13.18 `approvals`

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| entry_id | UUID FK | N | FK → financial_entries |
| user_id | UUID | N | Quem aprovou/rejeitou |
| action | ENUM | N | `APPROVED` ou `REJECTED` |
| notes | TEXT | S | Motivo (obrigatório para rejeição) |

---

## 14. STORAGE (Cloudflare R2)

- Bucket único: `nexos-erp-attachments`
- Organização: `{tenantId}/{branchId}/attachments/{uuid}.{ext}`
- Upload via presigned URL (frontend → R2 direto)
- Download via presigned URL (expiração 1h)
- Limite: 10MB por arquivo, tipos: PDF, JPG, PNG

### Limite de storage por tenant

| Plano | Limite |
|---|---|
| Starter | 2GB |
| Pro | 10GB |
| Enterprise | 50GB (ou customizado) |

Tabela `tenant_storage_usage` (schema public): `tenant_id` UUID PK, `used_bytes` BIGINT default 0. Atualizado atomicamente. Se exceder → `413 Payload Too Large` com código `STORAGE_LIMIT_EXCEEDED`.

---

## 15. MIGRATIONS MULTI-TENANT

### Tabela de controle: `tenant_migrations` (schema public)

| Campo | Tipo | Null | Descrição |
|---|---|---|---|
| tenant_id | UUID | N | ID do tenant |
| migration_name | VARCHAR(200) | N | Nome da migration |
| status | ENUM | N | `PENDING`, `SUCCESS`, `FAILED` |
| error_message | TEXT | S | Mensagem de erro |
| applied_at | TIMESTAMP | S | Data de aplicação |
| duration_ms | INTEGER | S | Tempo em ms |

Índices: `UNIQUE(tenant_id, migration_name)`, `INDEX(status)`

### Processo
1. Runner lista tenants ativos
2. Verifica migrations já aplicadas (SUCCESS)
3. Executa pendentes em transação **por tenant** (BEGIN + migration + COMMIT)
4. Falha → ROLLBACK no schema, registra FAILED
5. Re-executar: `pnpm run migration:retry --tenant=uuid`

### Regras
- Cada migration em transação isolada por tenant
- Idempotentes quando possível (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- Advisory lock no PostgreSQL previne execução paralela
- Com 500+ tenants: batches de 10-20 via worker pool
- Novo tenant recebe todas as migrations de uma vez

---

## 16. TRANSIÇÕES DE STATUS

```
DRAFT → PENDING_APPROVAL      (existe approval_rule ativa para o valor)
DRAFT → PENDING               (nenhuma approval_rule se aplica)
DRAFT → CANCELLED             (criador cancela rascunho)

PENDING_APPROVAL → PENDING    (aprovador aprova — gera document_number aqui)
PENDING_APPROVAL → CANCELLED  (aprovador rejeita — motivo obrigatório)

PENDING → OVERDUE             (job diário: due_date < hoje)
PENDING → PAID                (pagamento total)
PENDING → PARTIAL             (pagamento parcial)
PENDING → CANCELLED           (cancelamento com motivo)

PARTIAL → PAID                (novo pagamento completa saldo)
PARTIAL → PARTIAL             (novo pagamento parcial)

OVERDUE → PAID                (pagamento após vencimento)
OVERDUE → PARTIAL             (parcial após vencimento)
OVERDUE → CANCELLED           (cancelamento com motivo)

PAID → PENDING                (estorno total dentro do prazo)
PAID → PARTIAL                (estorno parcial)
PARTIAL → PENDING             (estorno de todos os pagamentos)
```

---

## 17. REGRAS DE NEGÓCIO

| Regra | Detalhe |
|---|---|
| Valor positivo | `amount > 0` e `<= 999999999.99` |
| Precisão decimal | Máximo 2 casas decimais |
| Datas coerentes | `due_date >= issue_date`, `issue_date <= hoje` |
| Categoria compatível | PAYABLE exige DESPESA; RECEIVABLE exige RECEITA |
| Categoria ativa | Não permite vincular categoria com `active=false` |
| Status imutável | CANCELLED e PAID não voltam para PENDING (exceto estorno) |
| Edição restrita | Somente PENDING pode ser editado |
| Exclusão lógica | Nunca DELETE físico |
| Auditoria obrigatória | Toda ação gera `audit_logs` |
| Numeração única | `document_number` via SELECT FOR UPDATE |
| Período bloqueado | Se data <= `locked_until` → `422` |
| Estorno com prazo | Dentro de `max_refund_days` (90 pagar / 180 receber) |
| Baixa parcial | Registro em `entry_payments`, status PARTIAL até quitação |

---

## 18. FLUXOS DE USUÁRIO (implementar exatamente assim)

### 18.1 Criar conta a pagar (com aprovação)
1. Verificar permissão `financial.entries.create`
2. Formulário com data de emissão = hoje
3. Preencher: descrição, categoria (DESPESA), valor, vencimento
4. Opcionalmente: fornecedor, parcelamento
5. "Salvar como rascunho" → status `DRAFT` (sem document_number)
6. "Salvar e enviar":
   - Verifica `approval_rules` para tipo e valor
   - Se `amount >= min_amount` → `PENDING_APPROVAL` + notificação
   - Se não → gera `document_number` + `PENDING`
7. Se parcelado: cria `recurrence` + N entries (mesmo status para todas)
8. Registra `CREATE` em `audit_logs`

### 18.2 Registrar pagamento (baixa total ou parcial)
1. Verificar permissão `financial.entries.pay`
2. Verificar bloqueio contábil
3. Modal: data pagamento (default hoje), valor (default saldo restante), forma, conta
4. Valor pode ser parcial
5. Criar `financial_entry_payments`
6. Se `SUM(payments) >= entry.amount` → `PAID`
7. Se `SUM(payments) < entry.amount` → `PARTIAL`
8. Atualizar `paid_amount` e `paid_date` na entry
9. Registrar `PAY` em `audit_logs`
10. Invalidar caches de dashboard e reports

### 18.3 Estornar pagamento
1. Verificar permissão `financial.entries.cancel`
2. Calcular dias desde último pagamento
3. Se dias > `max_refund_days` → desabilitado (`REFUND_PERIOD_EXPIRED`)
4. Se dentro do prazo: modal com motivo obrigatório
5. Remover último registro de `financial_entry_payments`
6. Recalcular status: `SUM = 0` → `PENDING`, `SUM > 0` → `PARTIAL`
7. Registrar `REFUND` em `audit_logs`
8. Se boleto via gateway → cancelar via API (com circuit breaker)

### 18.4 Aprovar/Rejeitar
1. Verificar permissão `financial.entries.approve`
2. Lista mostra `PENDING_APPROVAL` que a role pode aprovar
3. Aprovar → gera `document_number`, status = `PENDING`
4. Rejeitar → motivo obrigatório, status = `CANCELLED`
5. Registrar em tabela `approvals` + `audit_logs`
6. Notificar criador

### 18.5 Transferir entre contas
1. Verificar permissão `financial.entries.create`
2. Contas diferentes, mesmo `branch_id`, valor > 0, data não bloqueada
3. Criar `account_transfers`
4. Movimentação neutra (não afeta DRE)
5. Registrar em `audit_logs`

---

## 19. ENDPOINTS DA API

Prefixo: `/api/v1`. JWT obrigatório (`aud=erp.zonadev.tech`). Header `X-Branch-Id` em endpoints financeiros. Todas as respostas seguem o formato padrão da seção 5.

### 19.1 Financial Entries
```
GET    /entries                    entries.view      Listar (paginado, filtros)
GET    /entries/:id                entries.view      Detalhe
POST   /entries                    entries.create    Criar (Idempotency-Key)
PUT    /entries/:id                entries.edit      Editar (somente PENDING)
POST   /entries/:id/pay            entries.pay       Registrar pagamento (Idempotency-Key)
POST   /entries/:id/cancel         entries.cancel    Cancelar (Idempotency-Key)
DELETE /entries/:id                entries.delete    Soft delete
POST   /entries/:id/restore        ADMIN             Restaurar soft delete
POST   /entries/batch-pay          entries.pay       Baixa em lote (Idempotency-Key)
POST   /entries/:id/refund         entries.cancel    Estornar (Idempotency-Key)
GET    /entries/:id/payments       entries.view      Histórico de pagamentos
```

### 19.2 Categories
```
GET    /categories                 categories.view    Listar árvore
POST   /categories                 categories.manage  Criar
PUT    /categories/:id             categories.manage  Editar
DELETE /categories/:id             categories.manage  Desativar/excluir
```

### 19.3 Contacts
```
GET    /contacts                   entries.view       Listar
POST   /contacts                   entries.create     Criar
PUT    /contacts/:id               entries.edit       Editar
```

### 19.4 Bank Accounts
```
GET    /bank-accounts              entries.view           Listar
POST   /bank-accounts              bank_accounts.manage   Criar
PUT    /bank-accounts/:id          bank_accounts.manage   Editar
```

### 19.5 Reconciliation
```
POST   /reconciliation/import      reconciliation.execute   Upload e parse
GET    /reconciliation/:batchId    reconciliation.execute   Itens do lote
POST   /reconciliation/match       reconciliation.execute   Confirmar match
DELETE /reconciliation/:batchId    ADMIN                    Desfazer
```

### 19.6 Reports
```
GET    /reports/dre                reports.view     DRE (cache 300s)
GET    /reports/balance-sheet      reports.view     Balancete (cache 300s)
GET    /reports/cashflow           reports.view     Fluxo de caixa (cache 300s)
GET    /reports/aging              reports.view     Aging de contas
GET    /reports/export             reports.export   Exportar PDF/CSV
```

### 19.7 Dashboard
```
GET    /dashboard/summary          dashboard.view   Cards de resumo (cache 60s)
GET    /dashboard/cashflow-chart   dashboard.view   Dados do gráfico (cache 60s)
GET    /dashboard/overdue          dashboard.view   Contas vencidas (cache 60s)
```

### 19.8 Audit Logs
```
GET    /audit-logs                 audit.view       Listar (paginado)
GET    /audit-logs/:id             audit.view       Detalhe
GET    /audit-logs/export          audit.view       Exportar CSV
```

### 19.9 Settings e RBAC
```
GET    /settings                   settings.manage   Config da filial
PUT    /settings                   settings.manage   Atualizar config
GET    /roles                      ADMIN             Listar roles
POST   /roles                      ADMIN             Criar role
PUT    /roles/:id                  ADMIN             Editar role
DELETE /roles/:id                  ADMIN             Excluir role
GET    /users/:id/roles            ADMIN             Roles do usuário
POST   /users/:id/roles            ADMIN             Atribuir role
DELETE /users/:id/roles/:roleId    ADMIN             Remover role
```

### 19.10 Branches
```
GET    /branches                   ADMIN             Listar filiais
GET    /branches/my                (qualquer)        Filiais do usuário
POST   /branches                   branches.manage   Criar
PUT    /branches/:id               branches.manage   Editar
DELETE /branches/:id               branches.manage   Desativar
GET    /branches/:id/users         ADMIN             Usuários da filial
POST   /branches/:id/users         users.manage      Vincular usuário
DELETE /branches/:id/users/:userId users.manage      Desvincular
```

### 19.11 Transfers
```
GET    /transfers                  entries.view      Listar
POST   /transfers                  entries.create    Criar (Idempotency-Key)
DELETE /transfers/:id              ADMIN             Estornar
```

### 19.12 Collection Rules
```
GET    /collection-rules           settings.manage   Listar
POST   /collection-rules           settings.manage   Criar
PUT    /collection-rules/:id       settings.manage   Editar
DELETE /collection-rules/:id       settings.manage   Excluir
GET    /email-templates            settings.manage   Listar templates
PUT    /email-templates/:id        settings.manage   Editar
POST   /email-templates/:id/preview settings.manage  Preview
```

### 19.13 Lock Periods
```
GET    /lock-periods               settings.manage   Listar
POST   /lock-periods               settings.manage   Criar
DELETE /lock-periods/:id           ADMIN             Remover
```

### 19.14 Boletos
```
GET    /boletos                    entries.view      Listar
POST   /boletos/:entryId/generate  entries.create    Gerar via gateway (Idempotency-Key)
POST   /boletos/:entryId/cancel    entries.cancel    Cancelar no gateway
GET    /boletos/:entryId/pdf       entries.view      Download PDF
POST   /boletos/webhook            (gateway)         Webhook de pagamento
```

### 19.15 Approvals
```
GET    /approvals/pending          entries.approve   Listar pendentes
POST   /approvals/:entryId/approve entries.approve   Aprovar
POST   /approvals/:entryId/reject  entries.approve   Rejeitar
POST   /approvals/batch-approve    entries.approve   Aprovar em lote
GET    /approvals/history          entries.approve   Histórico
```

### 19.16 Approval Rules
```
GET    /approval-rules             approval_rules.manage   Listar
POST   /approval-rules             approval_rules.manage   Criar
PUT    /approval-rules/:id         approval_rules.manage   Editar
DELETE /approval-rules/:id         approval_rules.manage   Excluir
```

---

## 20. JOBS E AUTOMAÇÕES

| Job | Schedule | Descrição |
|---|---|---|
| Atualizar vencidos | Diário 00:30 | PENDING/PARTIAL com `due_date < hoje` → OVERDUE |
| Gerar recorrências | Diário 01:00 | Recorrências indefinidas: gera próximas se < 30 dias cobertura |
| Régua de cobrança | Diário 06:00 | Envia e-mails conforme `collection_rules` |
| E-mail agradecimento | A cada pagamento | Via fila após baixa se regra ON_PAYMENT ativa |
| Cleanup attachments | Semanal dom 03:00 | Remove arquivos órfãos no R2 |
| Init sequences | Anual 01/jan 00:00 | Cria `document_sequences` para novo ano |

Todos via **BullMQ (Redis)** para execução única em multi-instância.

---

## 21. ARQUITETURA SAAS

### 21.1 Feature Flags

Tabela `feature_flags` (schema public):

| Campo | Tipo | Descrição |
|---|---|---|
| tenant_id | UUID | ID do tenant |
| feature_code | VARCHAR(50) | Código da feature |
| enabled | BOOLEAN | Ativa/inativa |
| metadata | JSONB | Config extras (max_branches, max_users) |

Features controladas:
- `boletos_enabled`: Starter: não, Pro: sim, Enterprise: sim
- `approval_flow_enabled`: Starter: não, Pro: sim, Enterprise: sim
- `branches_enabled`: Starter: não (1 filial), Pro: até 5, Enterprise: ilimitado
- `collection_rules_enabled`: Starter: não, Pro: sim, Enterprise: sim
- `api_access_enabled`: Enterprise only

Verificação via guard NestJS. Cache Redis TTL 5min.

### 21.2 Rate Limiting

- Global por tenant: 1000 req/min (configurável por plano)
- Endpoints sensíveis: `/entries` POST = 100/min, `/reconciliation/import` = 10/min, `/boletos/generate` = 50/min
- Implementação: `@nestjs/throttler` com Redis. Retorna `429 Too Many Requests` com código `RATE_LIMIT_EXCEEDED`

### 21.3 Idempotency Keys

Header `Idempotency-Key: <uuid-v4>` em endpoints com side effects.

- Armazena em Redis: `idempotency:{key}` → response (TTL 24h)
- Mesmo key → retorna response armazenada sem reprocessar
- Key com payload diferente → retorna `409 Conflict` com código `CONFLICT`
- Endpoints: POST /entries, POST /entries/:id/pay, POST /entries/:id/cancel, POST /transfers, POST /boletos/:id/generate

### 21.4 Observability

**Logs**: pino (JSON structured). Campos: timestamp, level, tenantId, branchId, userId, requestId, message. Centralização: Grafana Loki ou CloudWatch.

**Métricas**: prom-client (Prometheus). Endpoint `/metrics` (interno). Métricas: request_duration_seconds, entries_created_total, payments_processed_total, active_tenants_gauge, job_execution_duration, error_rate. Visualização: Grafana.

**Tracing**: @opentelemetry/sdk-node. Traces distribuídos. requestId do audit_log vincula ao trace. Visualização: Jaeger ou Grafana Tempo.

### 21.5 Backup e Disaster Recovery

- Backup lógico diário: `pg_dump` às 02:00 UTC, retenção 30 dias, bucket R2 `nexos-erp-backups`
- WAL archiving contínuo: a cada 5min para PITR (últimos 7 dias)
- Teste de restore mensal em staging
- Redis: RDB a cada 15min + AOF
- **RPO: 5 minutos (WAL). RTO: 30 minutos**

---

## 22. MAPA DE TELAS

### 22.1 Dashboard (`/dashboard`) — `financial.dashboard.view`
- Cards: Saldo atual, Total a receber (30d), Total a pagar (30d), Resultado do mês
- Gráfico fluxo de caixa: linha temporal entradas (verde) x saídas (vermelho), 12 meses
- Gráfico composição: donut de despesas por categoria no mês
- Lista de contas vencidas
- Filtro de período (mês/ano)

### 22.2 Contas a Pagar (`/financeiro/contas-pagar`) — `financial.entries.view`
- Colunas: Código, Descrição, Fornecedor, Categoria (badge), Vencimento, Valor (R$), Status (badge)
- Status: RASCUNHO, AGUARD. APROVAÇÃO, PENDENTE, PARCIAL, PAGO, VENCIDO, CANCELADO
- Filtros: status, período, categoria (DESPESA), busca texto
- Ações: Nova conta, ações em lote, exportar CSV/PDF

### 22.3 Formulário de Conta (`/financeiro/contas-pagar/nova`)
- Campos: descrição (3-200), fornecedor (autocomplete), categoria (DESPESA), valor (> 0), data emissão (não futura), vencimento (>= emissão), conta bancária, parcelamento (toggle → num parcelas 2-120, frequência), observações (max 500), anexo (PDF/JPG/PNG, max 10MB)

### 22.4 Contas a Receber — idêntico com ajustes
- "Fornecedor" → "Cliente", categorias RECEITA, PAGO → RECEBIDO na UI

### 22.5 Fluxo de Caixa (`/financeiro/fluxo-caixa`) — `financial.reports.view`
- Granularidade: diário/semanal/mensal
- Gráfico barras empilhadas + linha saldo acumulado
- Toggle projeção (PENDING futuro com opacidade)
- Alerta saldo negativo

### 22.6 Categorias (`/financeiro/categorias`) — `financial.categories.manage`
- Árvore hierárquica (max 3 níveis)
- Badges RECEITA (verde) / DESPESA (vermelho)
- Categorias com lançamentos: só desativar

### 22.7 Conciliação (`/financeiro/conciliacao`) — `financial.reconciliation.execute`
- Upload OFX/CSV → parse → tela split (extrato x lançamentos)
- Match automático: valor + data ±3 dias
- Confirmar, rejeitar ou criar novo lançamento

### 22.8 Relatórios (`/financeiro/relatorios`) — `financial.reports.view`
- **DRE**: Receita bruta → deduções → receita líquida → despesas → resultado. Comparativo período anterior
- **Balancete**: movimentação por categoria, saldo anterior/entradas/saídas/saldo final
- **Aging**: agrupado por faixa de atraso (1-15d, 16-30d, 31-60d, 60+)

### 22.9 Auditoria (`/financeiro/auditoria`) — `financial.audit.view`
- Tabela com filtros: usuário, ação, entidade, período
- Detalhe: field_changes (before/after)
- Somente leitura — exportar CSV

### 22.10 Configurações (`/financeiro/configuracoes`) — `financial.settings.manage`
- Contas bancárias (CRUD), dia de fechamento, prazo de estorno, bloqueio contábil, gerenciar roles

### 22.11 Régua de Cobrança (`/financeiro/regua-cobranca`) — `financial.settings.manage`
- Lista de regras, preview de e-mail, templates editáveis

### 22.12 Transferências (`/financeiro/transferencias`) — `financial.entries.create`
- Conta origem, destino, valor, data, descrição. Não aparece no DRE.

### 22.13 Boletos (`/financeiro/boletos`) — `financial.entries.view`
- Lista com status: PENDENTE, PAGO, CANCELADO, VENCIDO
- Ações: visualizar PDF, reenviar e-mail, cancelar

### 22.14 Aprovações (`/financeiro/aprovacoes`) — `financial.entries.approve`
- Lista PENDING_APPROVAL filtrada por role do usuário
- Badge de valor (vermelho > R$ 10.000)
- Aprovar (confirma), rejeitar (motivo obrigatório), aprovar em lote

---

## 23. ONBOARDING DE NOVO TENANT

Executar na ordem:

1. Primeiro acesso via SSO detecta que não existe schema
2. Criar schema: `tenant_[uuid]`
3. Executar todas as migrations
4. Criar roles padrão (Admin, Financeiro, Vendas, Auditor) com permissões
5. Atribuir role Admin ao primeiro usuário
6. Criar filial "Matriz" com `is_headquarters=true`
7. Vincular Admin à Matriz via `user_branches`
8. Criar categorias padrão na Matriz:
   - Receitas: Vendas produtos, Vendas serviços, Outras
   - Despesas: Aluguel, Folha, Impostos, Marketing, Fornecedores, Utilities, Outras
9. Criar `financial_settings` com defaults (incluindo `max_refund_days`)
10. Inicializar `document_sequences` para o ano atual
11. Criar `email_templates` padrão e `collection_rules` padrão (6 regras da régua)
12. Redirect para dashboard com Matriz selecionada + tour de boas-vindas

---

## 24. CÁLCULOS FINANCEIROS

### DRE
- Receita bruta = `SUM(paid_amount)` de entries RECEIVABLE + PAID no período
- Despesas = `SUM(paid_amount)` de entries PAYABLE + PAID, agrupado por categoria
- Resultado = Receitas - Despesas
- Comparativo: mesmo DRE período anterior com variação percentual
- **TODOS os cálculos com `decimal.js` no service, agregações `SUM` no banco**

### Fluxo de Caixa
- Saldo inicial = `SUM(bank_accounts.initial_balance)` + `SUM(entries PAID com paid_date < início)`
- Entradas = `SUM(paid_amount)` RECEIVABLE PAID no período
- Saídas = `SUM(paid_amount)` PAYABLE PAID no período
- Saldo acumulado = saldo inicial + entradas - saídas (acumulativo)
- Projeção: entries PENDING com due_date futura

---

## 25. ESTRATÉGIA DE IMPLEMENTAÇÃO POR MÓDULO

**NÃO gerar todo o código de uma vez.** Implementar módulo por módulo na seguinte ordem. Cada módulo só começa quando o anterior estiver funcionando.

### Fase 1 — Infraestrutura Base (Módulos 1-3)
```
Módulo 1: Tenant Context
  - Interceptor que extrai tenantId do JWT e seta schema Drizzle
  - Middleware de requestId
  - Custom types Drizzle para DECIMAL → string

Módulo 2: Migration Runner
  - Tabela tenant_migrations (schema public)
  - Comando: pnpm run migration:apply
  - Comando: pnpm run migration:retry --tenant=uuid

Módulo 3: Auth + Guards Base
  - JwtGuard (valida JWT via JWKS)
  - TenantInterceptor (seta schema)
  - RequestIdMiddleware
  - AllExceptionsFilter (formato de erro padrão)
  - ApiResponse class
```

### Fase 2 — RBAC + Filiais (Módulos 4-6)
```
Módulo 4: Branches
  - Tabela branches + CRUD
  - BranchGuard (valida X-Branch-Id + acesso)

Módulo 5: RBAC
  - Tabelas: roles, permissions, role_permissions, user_roles, user_branches
  - RbacGuard + @RequirePermission decorator
  - Cache Redis 5min

Módulo 6: Feature Flags
  - Tabela feature_flags (schema public)
  - FeatureFlagGuard + @RequireFeature decorator
  - Cache Redis 5min
```

### Fase 3 — Financeiro Core (Módulos 7-11)
```
Módulo 7: Audit Logs
  - Tabela audit_logs
  - AuditInterceptor global
  - Audit service

Módulo 8: Categories
  - CRUD por filial (hierarquia max 3 níveis)
  - Validação: não excluir com lançamentos vinculados

Módulo 9: Bank Accounts
  - CRUD por filial
  - FK composta (id, branch_id)

Módulo 10: Contacts
  - CRUD nível tenant (compartilhado entre filiais)

Módulo 11: Financial Entries
  - CRUD com numeração por filial (SELECT FOR UPDATE)
  - Parcelamento (gera N entries)
  - Validações: período bloqueado, categoria compatível, status
  - Fluxo de aprovação (PENDING_APPROVAL → PENDING/CANCELLED)
```

### Fase 4 — Pagamentos + Conciliação (Módulos 12-14)
```
Módulo 12: Payments
  - Baixa total e parcial (financial_entry_payments)
  - Estorno com prazo
  - Cálculos com decimal.js

Módulo 13: Transfers
  - Transferência entre contas (não afeta DRE)
  - Lock periods

Módulo 14: Reconciliation
  - Import OFX/CSV
  - Algoritmo de match (valor + data ±3 dias)
  - Tela split
```

### Fase 5 — Reports + Dashboard (Módulos 15-16)
```
Módulo 15: Dashboard
  - Cards de resumo
  - Gráficos (fluxo de caixa, composição)
  - Cache Redis 60s

Módulo 16: Reports
  - DRE, balancete, aging, fluxo de caixa
  - Exportação PDF/CSV
  - Cache Redis 300s
```

### Fase 6 — Integrações + Automação (Módulos 17-19)
```
Módulo 17: Boletos
  - Gateway API (Asaas/Efi/Iugu)
  - Circuit breaker
  - Webhook de pagamento

Módulo 18: Collection Rules
  - Régua de cobrança
  - Templates de e-mail
  - Job diário BullMQ

Módulo 19: Settings + Onboarding
  - Configurações por filial
  - Onboarding automático (12 passos)
  - Seed de dados padrão
```

### Fase 7 — Frontend (Módulo 20)
```
Módulo 20: Frontend Completo
  - Branch switcher
  - Todas as 14 telas da seção 22
  - TanStack Query para data layer
  - Skeleton loaders + error boundaries
  - Máscara monetária com centavos
```

---

## 26. EVOLUÇÕES DE PERFORMANCE (preparar no MVP, implementar sob demanda)

Estas otimizações **NÃO são MVP**, mas o código deve ser estruturado para suportá-las sem rewrite. Implementar quando métricas indicarem necessidade.

### 26.1 Materialized Views para Relatórios

Relatórios pesados (DRE, balancete, fluxo de caixa) podem ficar lentos com alto volume de lançamentos. Solução: **Materialized Views** no PostgreSQL.

```sql
-- Exemplo: visão materializada do DRE por mês/filial
CREATE MATERIALIZED VIEW mv_dre_monthly AS
SELECT
  branch_id,
  date_trunc('month', p.payment_date) AS month,
  e.type,
  e.category_id,
  SUM(p.amount) AS total
FROM financial_entry_payments p
JOIN financial_entries e ON e.id = p.entry_id
WHERE e.status IN ('PAID', 'PARTIAL')
  AND e.deleted_at IS NULL
GROUP BY branch_id, month, e.type, e.category_id;

-- Refresh diário (job BullMQ após meia-noite):
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dre_monthly;
```

**Quando implementar**: quando queries de DRE/balancete ultrapassarem 500ms consistentemente. O cache Redis (300s) resolve para a maioria dos cenários. Materialized views são o próximo nível.

**Preparação no MVP**: manter queries de relatórios isoladas nos repositories (`reports.repository.ts`) — assim é fácil trocar a query por `SELECT * FROM mv_dre_monthly` sem mudar service nem controller.

### 26.2 Table Partitioning para `financial_entries`

Com milhões de lançamentos, `financial_entries` pode ficar lenta. Solução: **particionamento por ano**.

```sql
-- Particionar por issue_date (ano)
CREATE TABLE financial_entries (
  -- ... campos ...
) PARTITION BY RANGE (issue_date);

CREATE TABLE financial_entries_2025 PARTITION OF financial_entries
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE financial_entries_2026 PARTITION OF financial_entries
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- PostgreSQL roteia queries automaticamente para a partição correta
-- WHERE issue_date BETWEEN '2026-01-01' AND '2026-12-31' → só acessa financial_entries_2026
```

**Quando implementar**: quando uma filial ultrapassar 500k lançamentos e queries com filtro de data ficarem lentas. Índices compostos (já definidos na seção 13) resolvem até esse ponto.

**Preparação no MVP**: NÃO particionar agora. Mas garantir que **TODA** query em `financial_entries` inclua filtro de `branch_id` + range de data. Isso é necessário tanto para o filtro de filial quanto para futura partição.

### 26.3 `daily_balances` — Snapshot Financeiro

Tabela pré-calculada para acelerar consultas de saldo e fluxo de caixa. Detalhada na seção 13 do modelo de dados (fase 2). Implementar quando queries de dashboard ultrapassarem 500ms.

---

## 27. REGRAS FINAIS

- **Não invente funcionalidades** que não estão neste documento
- **Não pule etapas** — siga a ordem de implementação por módulo
- **Toda operação financeira usa `decimal.js`** — sem exceção
- **Todo registro financeiro tem audit trail** — sem exceção
- **Soft delete global** — nunca DELETE físico em entidades financeiras
- **FK composta** para integridade de filial no nível do banco
- **Testes devem verificar precisão decimal** com `toBe('string')`, nunca `toBeCloseTo`
- **Transação de criação de lançamento < 50ms** — nada pesado dentro do lock
- **Cache Redis 5min** para permissões e feature flags
- **Idempotency keys** em todos os endpoints com side effects
- **Toda listagem é paginada** — query sem LIMIT é proibida
- **Todo endpoint retorna formato padrão** — ApiResponse para sucesso, ApiError para erro
- **Controller NUNCA contém lógica de negócio** — apenas validação + chamada ao service
- **Query timeout de 5s** — nenhuma query pode travar a conexão
- **Circuit breaker** em toda integração externa (boletos, e-mail, R2)
- **TanStack Query** para todo fetch no frontend — nenhum fetch direto em componente
- **3 estados visuais** em todo componente que faz fetch: loading (skeleton), erro, dados
- **NUNCA usar `SET search_path`** — sempre `.withSchema()` do Drizzle (pgBouncer safety)
- **NUNCA usar `KEYS *` ou `invalidatePattern`** no Redis — invalidar keys exatas via Event Bus
- **Campos formatados** — CPF, CNPJ, telefone, CEP: armazenar formatado, validar regex + dígito verificador no DTO
- **Event Bus** (`@nestjs/event-emitter`) para desacoplar side effects: cache, audit, notificações, e-mail
- **Queries de relatório isoladas no repository** — preparar para materialized views sem rewrite
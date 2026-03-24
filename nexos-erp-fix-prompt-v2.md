# NEXOS ERP — Fix: Máscaras + Dark Mode Inputs + pt-BR + Branch Switcher
# Baseado em problemas confirmados em produção e banco validado

---

## CONTEXTO (leia antes de qualquer ação)

O banco de dados está correto:
- `branch_id` existe em todas as 18 tabelas financeiras
- 2 filiais existem: "Matriz" (id: 2b2379e6-abe8-4c99-aaf3-fd96e6c16dee) e
  "Filial 1" (id: ece516cd-3e88-4d61-94b7-953dcfe18a73)
- Isolamento por filial já funciona no backend — problema é só frontend

---

## FASE 0 — LEITURA OBRIGATÓRIA

Leia e declare o conteúdo relevante de:

1. `frontend/src/styles/globals.css` — tokens de input (--bg-input, --input, etc.)
2. `frontend/src/components/ui/input.tsx` — classes CSS usadas no input
3. `frontend/src/components/ui/currency-input.tsx` — como valor monetário é tratado
4. `frontend/src/providers/branch-provider.tsx` — o que expõe (activeBranch, branches, setBranch?)
5. `frontend/src/components/layout/header.tsx` — onde aparece "Matriz", como branch é exibido
6. Buscar por `react-input-mask`, `imask`, `cleave` em `package.json` — existe lib de máscara?
7. Buscar por `phone`, `cnpj`, `cpf`, `document` nos arquivos de form em `features/` —
   quais inputs precisam de máscara (listar arquivos encontrados)

Declare ao final:
- "Tokens de input no globals.css: [--bg-input existe | não existe]"
- "Input component usa token de fundo: [sim, var(X) | não, usa cor hardcoded]"
- "Lib de máscara instalada: [nome | nenhuma]"
- "BranchProvider expõe: [lista de exports]"
- "Arquivos com input de telefone/CNPJ/CPF: [lista de caminhos]"

**NÃO avance sem completar essas declarações.**

---

## BLOCO 1 — Bug: inputs brancos no dark mode

### Problema
Campos de input (ex: "Valor" em Transferências) ficam com fundo branco e texto
preto no dark mode — ilegíveis.

### Causa
O input usa `background: white` hardcoded ou não herda os tokens de tema.

### Fix 1.1 — Verificar tokens de input no globals.css

**Arquivo:** `frontend/src/styles/globals.css`

Verificar se os tokens abaixo existem no `:root` e no `.light`.
Se não existirem, adicionar:

```css
:root {
  /* tokens já existentes — não remover */

  /* Adicionar se não existirem */
  --bg-input: hsl(230 14% 14%);      /* fundo escuro para dark mode */
  --text-input: hsl(210 40% 96%);    /* texto claro para dark mode */
  --placeholder-input: hsl(217 10% 40%); /* placeholder para dark mode */
}

.light {
  /* tokens já existentes — não remover */

  /* Adicionar se não existirem */
  --bg-input: hsl(210 40% 96%);      /* fundo claro para light mode */
  --text-input: hsl(222 47% 11%);    /* texto escuro para light mode */
  --placeholder-input: hsl(215 20% 65%); /* placeholder para light mode */
}
```

### Fix 1.2 — Corrigir componente Input

**Arquivo:** `frontend/src/components/ui/input.tsx`

Garantir que o input usa os tokens de tema, nunca cores hardcoded:

```tsx
// Verificar se a classe atual inclui:
// background: var(--bg-input) OU bg-[var(--bg-input)]
// color: var(--text-input) OU text-[var(--text-input)]

// Se não incluir, adicionar via className ou style:
<input
  className={cn(
    // classes existentes mantidas
    'bg-[var(--bg-input)] text-[var(--text-input)]',
    'placeholder:text-[var(--placeholder-input)]',
    'border border-[var(--border-default)]',
    className
  )}
  {...props}
/>
```

### Fix 1.3 — Verificar CurrencyInput e Select

**Arquivo:** `frontend/src/components/ui/currency-input.tsx`
**Arquivo:** `frontend/src/components/ui/select.tsx` (se existir)

Aplicar o mesmo padrão de tokens — `bg-[var(--bg-input)]` e `text-[var(--text-input)]`.
Verificar também elementos `<select>` nativos usados em formulários.

**Contrato obrigatório do CurrencyInput:**
O componente deve seguir estas regras sem exceção:

```
EXIBIÇÃO → sempre formatado: "R$ 1.234,56"
ESTADO INTERNO → sempre numérico (number) em centavos ou Decimal string
API → sempre string decimal: "1234.56" (nunca "R$ 1.234,56")
```

Verificar a implementação atual. Se o componente:
- Armazena string formatada no estado → corrigir para centavos como inteiro (ex: 123456)
- Envia string formatada para API → adicionar conversão antes do submit
- Não usa tokens de tema → aplicar `bg-[var(--bg-input)]` e `text-[var(--text-input)]`

Exemplo de contrato correto:
```tsx
// Estado interno: centavos como inteiro (evita float IEEE 754)
const [cents, setCents] = useState<number>(0)

// Exibição: formatar para pt-BR
const display = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(cents / 100)

// Valor para API: string decimal com 2 casas (conforme spec)
const apiValue = (cents / 100).toFixed(2)  // "1234.56"
```

### Fix 1.4 — Varredura em features

Após corrigir os componentes base, rodar busca para encontrar inputs hardcoded
que não usam o componente `<Input />`:

```
grep -r "background.*white\|bg-white\|background: #fff\|background-color: white" \
  frontend/src/features/ --include="*.tsx"
```

Para cada ocorrência encontrada fora de contexto intencional (ex: modal overlay),
substituir por `bg-[var(--bg-input)]`.

---

## BLOCO 2 — Máscaras de input

### Problema
Campos de telefone, CNPJ, CPF não formatam automaticamente.
Usuário precisa digitar no formato correto manualmente.

### Fix 2.1 — Instalar biblioteca de máscara

Verificar se já existe lib instalada (declarado na Fase 0).
Se não existir, instalar:

```bash
cd frontend && npm install react-input-mask @types/react-input-mask
```

### Fix 2.2 — Criar componente MaskedInput

**Arquivo:** `frontend/src/components/ui/masked-input.tsx` (criar se não existir)

Antes de criar, verificar se o projeto usa `react-hook-form` (buscar em `package.json`
e em `features/*/components/` por `useForm`, `Controller`, `register`).
Declarar: "react-hook-form encontrado: [sim | não]"

```tsx
'use client'

import { useId } from 'react'
import InputMask from 'react-input-mask'
import { cn } from '@/lib/utils'

// Máscaras padrão do sistema
export const MASKS = {
  phone:        '(99) 99999-9999',
  phoneLandline:'(99) 9999-9999',
  cpf:          '999.999.999-99',
  cnpj:         '99.999.999/9999-99',
  cep:          '99999-999',
} as const

type MaskType = keyof typeof MASKS

interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  maskType: MaskType
  value: string
  // onChange retorna valor SEM máscara (só dígitos) — nunca enviar máscara para API
  onChange: (rawValue: string) => void
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export function MaskedInput({
  maskType,
  value,
  onChange,
  label,
  error,
  hint,
  required,
  className,
  id: externalId,
  ...props
}: MaskedInputProps) {
  // useId garante id único mesmo com SSR — necessário para htmlFor funcionar corretamente
  const generatedId = useId()
  const inputId = externalId ?? generatedId

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}           // acessibilidade: associa label ao input
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
          {required && <span style={{ color: 'var(--danger)' }} aria-hidden> *</span>}
        </label>
      )}
      <InputMask
        id={inputId}
        mask={MASKS[maskType]}
        value={value}
        onChange={e => {
          // Remove TODOS os caracteres não numéricos antes de passar ao form/estado
          // Garante que API sempre recebe só dígitos: "11912345678" não "(11) 91234-5678"
          const raw = e.target.value.replace(/\D/g, '')
          onChange(raw)
        }}
        aria-invalid={!!error}        // acessibilidade: informa estado de erro ao leitor de tela
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={cn(
          'bg-[var(--bg-input)] text-[var(--text-input)]',
          'placeholder:text-[var(--placeholder-input)]',
          'border border-[var(--border-default)] rounded-md',
          'px-3 py-2 text-sm w-full outline-none transition-colors',
          // foco visível — acessibilidade obrigatória
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[var(--accent)]',
          error && 'border-[var(--danger)]',
          className
        )}
        {...props}
      />
      {error && (
        <span
          id={`${inputId}-error`}
          className="text-xs"
          role="alert"
          style={{ color: 'var(--danger)' }}
        >
          {error}
        </span>
      )}
      {hint && !error && (
        <span
          id={`${inputId}-hint`}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}

// ─── Wrapper para react-hook-form (Controller) ───────────────────────────────
// Usar quando o form usa useForm() + Controller
// Exemplo:
//   <Controller
//     name="cnpj"
//     control={control}
//     render={({ field, fieldState }) => (
//       <MaskedInputField
//         maskType="cnpj"
//         label="CNPJ"
//         field={field}        // field.value já é string sem máscara
//         error={fieldState.error?.message}
//       />
//     )}
//   />

import type { ControllerRenderProps } from 'react-hook-form'

interface MaskedInputFieldProps extends Omit<MaskedInputProps, 'value' | 'onChange'> {
  field: ControllerRenderProps<any, any>
}

export function MaskedInputField({ field, ...props }: MaskedInputFieldProps) {
  return (
    <MaskedInput
      {...props}
      value={field.value ?? ''}
      onChange={field.onChange}   // field.onChange recebe valor sem máscara
      onBlur={field.onBlur}
      name={field.name}
      ref={field.ref}
    />
  )
}
```

**Regra de integração com react-hook-form:**
- Se o form usa `register()` → usar `<MaskedInput value={watch('field')} onChange={v => setValue('field', v)} />`
- Se o form usa `Controller` → usar `<MaskedInputField field={field} />`
- O valor no form state deve ser SEMPRE sem máscara (só dígitos)
- A validação (ex: `cnpj.length === 14`) opera sobre o valor sem máscara

### Fix 2.3 — Aplicar MaskedInput nas telas

Localizar todos os arquivos identificados na Fase 0 que contêm inputs de
telefone, CNPJ ou CPF. Para cada um, substituir o `<Input />` ou `<input>`
pelo `<MaskedInput />`:

**Padrão de uso:**
```tsx
import { MaskedInput } from '@/components/ui/masked-input'

// Telefone
<MaskedInput
  maskType="phone"
  value={phone}
  onChange={setPhone}
  label="Telefone"
  placeholder="(11) 91234-5678"
/>

// CNPJ
<MaskedInput
  maskType="cnpj"
  value={cnpj}
  onChange={setCnpj}
  label="CNPJ"
  placeholder="00.000.000/0000-00"
/>

// CPF
<MaskedInput
  maskType="cpf"
  value={cpf}
  onChange={setCpf}
  label="CPF"
  placeholder="000.000.000-00"
/>
```

**Telas a verificar obrigatoriamente:**
- `frontend/src/features/settings/components/branch-manager.tsx` — CNPJ da filial
- `frontend/src/features/contacts/` — CPF/CNPJ de clientes/fornecedores
- Qualquer outro arquivo retornado pelo grep da Fase 0

---

## BLOCO 3 — Padronização pt-BR (linguagem)

### Problema
Termos em inglês visíveis ao usuário, falta de acentuação, linguagem técnica exposta.

### Fix 3.1 — Busca e substituição global

Rodar os greps abaixo e corrigir TODAS as ocorrências em arquivos `.tsx` de `src/`:

```bash
# Termos em inglês que devem ser substituídos
grep -rn "\"Roles\"\|'Roles'\|>Roles<\|label.*Roles" frontend/src --include="*.tsx"
grep -rn "PAYABLE\|RECEIVABLE" frontend/src/features --include="*.tsx"
grep -rn "\"Settings\"\|>Settings<" frontend/src --include="*.tsx"
grep -rn "\"Dashboard\"\|>Dashboard<" frontend/src --include="*.tsx"
grep -rn "\"Aging\"\|>Aging<" frontend/src --include="*.tsx"
```

**Tabela de substituições obrigatórias (texto visível ao usuário):**

| Atual | Correto |
|---|---|
| Roles | Permissões |
| PAYABLE | Despesa |
| RECEIVABLE | Receita |
| Settings (label/menu) | Configurações |
| Aging (label/menu) | Vencimentos |
| Dashboard (título de página) | Painel |
| Conciliacao | Conciliação |
| Transferencias | Transferências |
| Aprovacoes | Aprovações |
| Configuracoes | Configurações |
| Usuarios | Usuários |
| Filiais (sem acento já está ok) | Filiais |

**IMPORTANTE:** substituir APENAS texto visível ao usuário:
- labels, títulos, placeholders, mensagens, itens de menu
- NÃO alterar: nomes de variáveis, props, hrefs, imports, nomes de função,
  valores de enum no código (PAYABLE/RECEIVABLE como constante de tipo)

### Fix 3.2 — Verificar acentuação em mensagens de erro e toast

Buscar mensagens de erro/sucesso sem acentuação:
```bash
grep -rn "nao\|esta\|nenhum\|nenhuma\|propri\|filial\b" \
  frontend/src/features --include="*.tsx" | grep -v "//.*nao"
```

Corrigir acentuação onde encontrada em strings visíveis.

---

## BLOCO 4 — Branch Switcher funcional

### Contexto confirmado (banco validado)
- Filiais existentes: "Matriz" e "Filial 1"
- Backend: `GET /api/v1/branches/my` retorna filiais do usuário logado
- Backend filtra dados por `branch_id` via header `X-Branch-Id`
- BranchProvider já existe em `frontend/src/providers/branch-provider.tsx`

### Fix 4.1 — Verificar o que o BranchProvider já expõe

**Arquivo:** `frontend/src/providers/branch-provider.tsx`

Declarar o que já existe antes de qualquer alteração:
- Faz fetch de `GET /api/v1/branches/my`?
- Expõe `activeBranch`, `branches`, função para trocar?
- Persiste `branchId` em cookie?

**NÃO alterar este arquivo.** Apenas usar o que ele já expõe.

### Fix 4.2 — Conectar o switcher no Header

**Arquivo:** `frontend/src/components/layout/header.tsx`

Localizar onde "Matriz" é exibido e conectar ao BranchProvider.
Usar APENAS os hooks/contextos já existentes — não criar novo estado de branches.

```tsx
// Importar o hook existente identificado na Fase 0
// Exemplo genérico — adaptar para o nome real encontrado:
const { activeBranch, branches, setActiveBranch } = useBranchContext()

// Fallback: se activeBranch for null mas branches existe, usar a primeira filial
// Isso previne estado inconsistente onde o header mostra vazio
const currentBranch = activeBranch ?? branches?.[0] ?? null

// O switcher visual:
import { ChevronDown, Building2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'

const queryClient = useQueryClient()
const [open, setOpen] = useState(false)
const ref = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (typeof window === 'undefined') return
  const handler = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [])

// Trocar filial: atualiza contexto + invalida cache para forçar refetch imediato
const handleBranchChange = (branch: Branch) => {
  setActiveBranch(branch)
  // Invalidar todas as queries financeiras — garante dados atualizados da nova filial
  // mesmo se o branchId não mudou no queryKey por algum motivo
  queryClient.invalidateQueries({ queryKey: ['financial'] })
  setOpen(false)
}

// JSX — substituir o "Matriz" estático por:
<div ref={ref} className="relative">
  <button
    onClick={() => setOpen(o => !o)}
    // Desabilitar apenas se não há branches carregadas ainda
    disabled={branches === undefined}
    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm
               font-medium transition-colors
               disabled:opacity-60 disabled:cursor-not-allowed
               hover:bg-[var(--bg-surface-raised)]"
    style={{ color: 'var(--text-primary)' }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
    <span>{currentBranch?.name ?? 'Carregando...'}</span>
    {branches !== undefined && (
      <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
    )}
  </button>

  {open && (
    <div
      className="absolute top-full left-0 mt-1 min-w-[180px] rounded-lg py-1 z-50"
      style={{
        background: 'var(--bg-surface-raised)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      {/* Loading: branches ainda não carregou (undefined) */}
      {branches === undefined && (
        <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Carregando filiais...
        </div>
      )}

      {/* Empty: carregou mas veio vazio (array vazio) */}
      {branches !== undefined && branches.length === 0 && (
        <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma filial disponível
        </div>
      )}

      {/* Lista de filiais */}
      {branches?.map(branch => (
        <button
          key={branch.id}
          onClick={() => handleBranchChange(branch)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm
                     text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
          style={{
            color: branch.id === currentBranch?.id
              ? 'var(--accent-text)'
              : 'var(--text-primary)',
            background: branch.id === currentBranch?.id
              ? 'var(--accent-muted)'
              : 'transparent',
          }}
        >
          <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="flex-1">{branch.name}</span>
          {branch.id === currentBranch?.id && (
            <span style={{ color: 'var(--accent-text)' }}>✓</span>
          )}
        </button>
      ))}

      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

      <button
        onClick={() => {
          window.location.href = '/configuracoes/filiais'
          setOpen(false)
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm
                   text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Building2 size={13} />
        Gerenciar filiais
      </button>
    </div>
  )}
</div>
```

### Fix 4.3 — Garantir que troca de filial refaz todas as queries

**Arquivo:** verificar onde `activeBranch` ou `branchId` está no query key do TanStack Query.

O padrão correto é que `branchId` esteja em TODOS os query keys de dados financeiros:
```tsx
// ✅ correto — ao trocar filial, o branchId muda e o cache invalida automaticamente
queryKey: ['financial-entries', branchId, filters]

// ❌ errado — dados não atualizam ao trocar filial
queryKey: ['financial-entries', filters]
```

Verificar os hooks em `frontend/src/features/*/hooks/` e confirmar que `branchId`
(ou `activeBranch?.id`) está presente nos query keys. Se algum estiver faltando,
adicionar.

---

## REGRAS GLOBAIS

**Arquivos PROTEGIDOS — nunca modificar:**
- `src/middleware.ts`
- `src/providers/auth-provider.tsx`
- `src/providers/branch-provider.tsx` ← usar apenas, não alterar
- `src/app/api/v1/[...path]/route.ts`
- `src/app/api/auth/local-logout/route.ts`
- `src/lib/api-client.ts`
- `next.config.mjs`
- `src/styles/globals.css` ← regras obrigatórias:
  - Verificar se token já existe ANTES de adicionar (nunca duplicar)
  - Nunca sobrescrever token existente sem verificar todos os usos
  - Só adicionar dentro de `:root` ou `.light` — nunca criar novo seletor de tema
  - Nunca remover token existente

**Acessibilidade — obrigatório em todos os inputs:**
- `<label>` deve ter `htmlFor` apontando para o `id` do input
- Foco visível: `focus-visible:outline` sempre presente (nunca `outline-none` sem substituto)
- `aria-invalid={!!error}` quando campo tem erro
- `aria-describedby` apontando para o elemento de mensagem de erro

**Componentes — uso obrigatório:**
Se existir equivalente em `src/components/ui/`, usar obrigatoriamente.
Nunca criar estrutura visual com `<div>` custom quando existe componente pronto.

**Tokens — regra absoluta:**
- Nunca usar cores hardcoded (`bg-white`, `bg-gray-*`, `#fff`, `hsl(...)` direto)
- Sempre usar tokens: `var(--bg-input)`, `var(--text-input)`, etc.
- Tokens HSL: sempre `hsl(var(--token))`, nunca `var(--token)` direto em cor

**Texto visível — regra absoluta:**
- Toda interface em português com acentuação correta
- Nunca expor termos técnicos ao usuário (PAYABLE, RECEIVABLE, branch_id, etc.)
- Nunca alterar nomes de variáveis, enums, props ou funções no código

**Após cada bloco**, declarar: "Bloco X concluído. Arquivos modificados: [lista exata]"

**Lint + build antes de commitar.**

**Commit:** `fix(ui): input dark mode + masks + pt-BR + branch switcher`

---

## CHECKLIST DE ACEITAÇÃO (corrigir automaticamente se NÃO)

**Dark mode inputs:**
- [ ] Campos de input com fundo escuro no dark mode (não branco)
- [ ] Texto dos inputs legível no dark mode
- [ ] CurrencyInput com tokens corretos e contrato valor display/api respeitado
- [ ] Select com tokens corretos
- [ ] Nenhum input com `bg-white` ou cor hardcoded

**Acessibilidade:**
- [ ] Todo `<Input />` e `<MaskedInput />` tem `id` e `label` com `htmlFor`
- [ ] Foco visível em todos os inputs (focus-visible:outline)
- [ ] `aria-invalid` presente quando há erro
- [ ] `aria-describedby` aponta para mensagem de erro quando existe

**Máscaras:**
- [ ] Campo de telefone formata automaticamente: (11) 91234-5678
- [ ] Campo de CNPJ formata automaticamente: 00.000.000/0000-00
- [ ] Campo de CPF formata automaticamente: 000.000.000-00
- [ ] Valor enviado à API é sem máscara (só dígitos)

**Linguagem:**
- [ ] "Roles" não aparece em nenhum label/menu visível
- [ ] "PAYABLE"/"RECEIVABLE" não aparecem como texto ao usuário
- [ ] Todos os itens de menu com acentuação correta
- [ ] Mensagens de erro/toast em português correto

**Branch switcher:**
- [ ] "Matriz" e "Filial 1" aparecem no dropdown
- [ ] Se `activeBranch` for null, usa primeira filial como fallback (não exibe vazio)
- [ ] Estado `undefined` (loading) mostra "Carregando filiais..."
- [ ] Array vazio mostra "Nenhuma filial disponível"
- [ ] Clicar em "Filial 1" troca o contexto ativo
- [ ] Após troca, `queryClient.invalidateQueries` é chamado
- [ ] Dados da tela atualizam imediatamente após troca
- [ ] Filial ativa persiste após reload da página
- [ ] `branchId` presente nos query keys dos hooks financeiros

**Segurança:**
- [ ] Nenhum arquivo protegido foi modificado
- [ ] `globals.css` não teve tokens removidos
- [ ] `branch-provider.tsx` não foi alterado — apenas consumido
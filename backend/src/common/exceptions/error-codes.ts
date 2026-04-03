// Catalogo central de error codes do Nexos ERP.
// Convencao: [DOMINIO]_[CONTEXTO_ERRO] em UPPER_SNAKE_CASE.
// Nao renomear codes ja publicados. Para descontinuar, manter compatibilidade.

export const ErrorCodes = {
  // Validacao
  VALIDATION_ERROR:
    'Dados invalidos. Verifique os campos do formulario',
  VALIDATION_REQUIRED: 'Campo obrigatorio nao informado',
  VALIDATION_PHONE:
    'Telefone em formato invalido. Use apenas numeros (10 ou 11 digitos)',
  VALIDATION_EMAIL: 'E-mail em formato invalido',
  VALIDATION_CPF: 'CPF em formato invalido',
  VALIDATION_CNPJ: 'CNPJ em formato invalido',
  VALIDATION_DOCUMENT: 'CPF ou CNPJ em formato invalido',
  VALIDATION_AMOUNT:
    'Valor monetario invalido. Informe um numero positivo com ate 2 casas decimais',
  VALIDATION_DATE_ORDER:
    'Data de vencimento nao pode ser anterior a data de emissao',
  VALIDATION_DATE_FUTURE: 'Data de emissao nao pode ser futura',
  VALIDATION_INSTALLMENTS: 'Numero de parcelas deve ser entre 2 e 120',
  VALIDATION_FIELD_UNKNOWN: 'Campo nao permitido nesta operacao',
  VALIDATION_FILE:
    'Arquivo invalido. Formatos aceitos: PDF, JPG, PNG. Tamanho maximo: 10MB',

  // Lancamentos
  ENTRY_LOCKED_PERIOD:
    'Este lancamento esta em um periodo contabil bloqueado e nao pode ser alterado',
  ENTRY_INVALID_STATUS_EDIT:
    'Lancamentos com este status nao podem ser editados',
  ENTRY_INVALID_STATUS_CANCEL:
    'Lancamentos pagos ou parcialmente pagos devem ser estornados antes de cancelar',
  ENTRY_INVALID_STATUS_APPROVE:
    'Este lancamento ja foi aprovado ou rejeitado',
  ENTRY_CATEGORY_INACTIVE:
    'A categoria selecionada esta inativa. Selecione uma categoria ativa',
  ENTRY_CATEGORY_INCOMPATIBLE:
    'Categoria incompativel com o tipo de lancamento',
  ENTRY_DOCUMENT_NUMBER_FAILED:
    'Erro ao gerar numero do documento. Tente novamente',

  // Pagamentos
  PAYMENT_AMOUNT_EXCEEDS:
    'O valor informado excede o saldo restante do lancamento',
  PAYMENT_REFUND_PERIOD_EXPIRED:
    'Prazo para estorno expirado. Estornos devem ser realizados dentro do prazo configurado',
  PAYMENT_ALREADY_REFUNDED: 'Este pagamento ja foi estornado',

  // Transferencias
  TRANSFER_SAME_ACCOUNT:
    'Conta de origem e conta de destino nao podem ser a mesma',
  TRANSFER_DIFFERENT_BRANCH:
    'As contas bancarias devem pertencer a mesma filial',
  TRANSFER_ACCOUNT_INACTIVE:
    'Conta bancaria inativa ou nao pertence a esta filial',

  // Categorias e contatos
  CATEGORY_HAS_ENTRIES:
    'Categoria com lancamentos vinculados nao pode ser excluida. Desative-a',
  CONTACT_DOCUMENT_DUPLICATE:
    'Ja existe um contato cadastrado com este CPF/CNPJ',

  // Relatorios e storage
  REPORT_RANGE_TOO_LARGE:
    'Periodo selecionado muito longo. Selecione no maximo 12 meses',
  STORAGE_LIMIT_EXCEEDED:
    'Limite de armazenamento do plano atingido. Faca upgrade para continuar',

  // Permissoes e autenticacao
  RBAC_FORBIDDEN: 'Voce nao tem permissao para realizar esta acao',
  RBAC_ROLE_SYSTEM: 'Roles do sistema nao podem ser excluidas',
  BRANCH_ACCESS_DENIED: 'Voce nao tem acesso a filial informada',
  BRANCH_MISSING: 'Filial nao informada. Selecione uma filial para continuar',
  AUTH_UNAUTHORIZED: 'Sessao expirada. Faca login novamente',
  AUTH_TOKEN_INVALID: 'Token invalido ou corrompido',
  AUTH_RATE_LIMIT:
    'Limite de requisicoes atingido. Aguarde alguns instantes',
  AUTH_PLAN_RESTRICTED:
    'Esta funcionalidade nao esta disponivel no seu plano atual',

  // Sistema
  INTERNAL_ERROR: 'Erro interno do sistema. Nossa equipe foi notificada',
  INTERNAL_UNAVAILABLE:
    'Servico temporariamente indisponivel. Tente novamente em instantes',
  INTERNAL_TIMEOUT:
    'Tempo de resposta excedido. Verifique sua conexao e tente novamente',
  INTERNAL_GATEWAY_ERROR:
    'Erro na comunicacao com o gateway de pagamento. Tente novamente',
  INTERNAL_DUPLICATE_REQUEST:
    'Operacao duplicada detectada. Esta acao ja foi processada',

  // Compatibilidade com codes ja existentes no backend
  ENTRY_APPROVAL_REQUIRED:
    'Este lancamento esta aguardando aprovacao e nao pode ser operado diretamente',
  APPROVAL_RULE_NOT_FOUND:
    'Regra de aprovacao nao encontrada para a filial informada',
  APPROVAL_SELF_FORBIDDEN:
    'O criador do lancamento nao pode aprovar a propria solicitacao',
  AUTH_API_ERROR: 'Falha ao consultar usuario no servico de autenticacao',
  AUTH_FORBIDDEN:
    'Voce nao tem permissao para acessar esta funcionalidade no servico de autenticacao',
  AUTH_USER_NOT_FOUND:
    'Usuario nao cadastrado no servico de autenticacao. Cadastre o usuario antes de continuar',
  BANK_ACCOUNT_NOT_FOUND:
    'Conta bancaria nao encontrada para a filial informada',
  BOLETO_ALREADY_GENERATED:
    'Ja existe um boleto ativo para este lancamento',
  BRANCH_NOT_FOUND: 'Filial nao encontrada',
  CATEGORY_NOT_FOUND:
    'Categoria nao encontrada para a filial informada',
  COLLECTION_RULE_NOT_FOUND:
    'Regra de cobranca nao encontrada para a filial informada',
  CONTACT_NOT_FOUND: 'Contato nao encontrado',
  EMAIL_TEMPLATE_NOT_FOUND:
    'Template de e-mail nao encontrado para a filial informada',
  ENTRY_NOT_ELIGIBLE_FOR_RECONCILIATION:
    'O lancamento informado nao pode ser conciliado no status atual',
  ENTRY_NOT_FOUND: 'Lancamento nao encontrado para a filial informada',
  GATEWAY_INVALID_RESPONSE:
    'O gateway de boletos retornou uma resposta invalida',
  GATEWAY_NOT_CONFIGURED: 'Servico de boletos nao configurado',
  GATEWAY_UNAVAILABLE:
    'Servico de boletos indisponivel. Tente novamente em instantes',
  PAYMENT_INSUFFICIENT_BALANCE:
    'Saldo insuficiente na conta de origem para concluir a transferencia',
  INVALID_PERIOD_OVERLAP:
    'Ja existe um periodo de bloqueio que se sobrepoe com as datas informadas',
  INVALID_STATUS_TRANSITION:
    'Nao e possivel executar esta transicao de status',
  NOT_FOUND: 'Registro nao encontrado',
  ONBOARDING_FAILED:
    'Falha ao configurar a empresa. Tente novamente em instantes',
  PAYMENT_EXCEEDS_BALANCE:
    'O valor informado excede o saldo restante do lancamento',
  RECONCILIATION_AMOUNT_DIVERGENCE:
    'O valor do extrato diverge do valor do lancamento acima da tolerancia permitida',
  RECONCILIATION_ITEM_ALREADY_MATCHED:
    'Este item do extrato ja foi conciliado',
  ROLE_NOT_FOUND: 'Role nao encontrada',
  ROLE_SYSTEM_LOCKED: 'Roles do sistema nao podem ser alteradas ou excluidas',
  TRANSFER_NOT_FOUND:
    'Transferencia nao encontrada para a filial informada',
  USER_ALREADY_LINKED: 'Usuario ja vinculado a este tenant',
  USER_NOT_FOUND: 'Usuario nao encontrado neste tenant',
  USER_NOT_PROVISIONED:
    'Usuario nao configurado neste tenant. Contate o administrador',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
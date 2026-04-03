import { ApiError } from './api-error';

export interface MappedError {
  message: string;
  action?: string;
  code: string;
}

export function mapApiError(error: ApiError): MappedError {
  switch (error.code) {
    case 'ENTRY_LOCKED_PERIOD':
      return {
        message: error.message,
        action: 'Contate um administrador para verificar o periodo contabil',
        code: error.code,
      };

    case 'ENTRY_INVALID_STATUS_EDIT':
    case 'ENTRY_INVALID_STATUS_CANCEL':
    case 'ENTRY_INVALID_STATUS_APPROVE':
    case 'ENTRY_APPROVAL_REQUIRED':
    case 'INVALID_STATUS_TRANSITION':
      return { message: error.message, code: error.code };

    case 'ENTRY_CATEGORY_INACTIVE':
    case 'ENTRY_CATEGORY_INCOMPATIBLE':
      return {
        message: error.message,
        action: 'Selecione outra categoria',
        code: error.code,
      };

    case 'ENTRY_DOCUMENT_NUMBER_FAILED':
      return {
        message: error.message,
        action: 'Tente novamente. Se o erro persistir, contate o suporte',
        code: error.code,
      };

    case 'PAYMENT_AMOUNT_EXCEEDS':
    case 'PAYMENT_EXCEEDS_BALANCE':
      return {
        message: error.message,
        action: 'Verifique o saldo restante do lancamento',
        code: error.code,
      };

    case 'PAYMENT_REFUND_PERIOD_EXPIRED':
      return {
        message: error.message,
        action: 'Entre em contato com o administrador financeiro',
        code: error.code,
      };

    case 'TRANSFER_SAME_ACCOUNT':
    case 'TRANSFER_DIFFERENT_BRANCH':
    case 'TRANSFER_ACCOUNT_INACTIVE':
    case 'TRANSFER_NOT_FOUND':
    case 'PAYMENT_INSUFFICIENT_BALANCE':
      return { message: error.message, code: error.code };

    case 'VALIDATION_ERROR':
      return {
        message: error.message,
        action: 'Revise os campos destacados no formulario',
        code: error.code,
      };

    case 'VALIDATION_REQUIRED':
    case 'VALIDATION_PHONE':
    case 'VALIDATION_EMAIL':
    case 'VALIDATION_CPF':
    case 'VALIDATION_CNPJ':
    case 'VALIDATION_DOCUMENT':
    case 'VALIDATION_AMOUNT':
    case 'VALIDATION_DATE_ORDER':
    case 'VALIDATION_DATE_FUTURE':
    case 'VALIDATION_INSTALLMENTS':
    case 'VALIDATION_FIELD_UNKNOWN':
    case 'VALIDATION_FILE':
      return { message: error.message, code: error.code };

    case 'AUTH_UNAUTHORIZED':
      return {
        message: error.message,
        action: 'Faca login novamente para continuar',
        code: error.code,
      };

    case 'RBAC_FORBIDDEN':
    case 'AUTH_FORBIDDEN':
    case 'APPROVAL_SELF_FORBIDDEN':
      return {
        message: error.message,
        action: 'Solicite acesso ao administrador',
        code: error.code,
      };

    case 'BRANCH_ACCESS_DENIED':
    case 'BRANCH_MISSING':
    case 'BRANCH_NOT_FOUND':
      return {
        message: error.message,
        action: 'Selecione uma filial no menu superior',
        code: error.code,
      };

    case 'AUTH_RATE_LIMIT':
      return {
        message: error.message,
        action: 'Aguarde alguns segundos e tente novamente',
        code: error.code,
      };

    case 'AUTH_PLAN_RESTRICTED':
      return {
        message: error.message,
        action: 'Acesse as configuracoes de plano para fazer upgrade',
        code: error.code,
      };

    case 'INTERNAL_UNAVAILABLE':
    case 'INTERNAL_TIMEOUT':
    case 'INTERNAL_GATEWAY_ERROR':
    case 'GATEWAY_UNAVAILABLE':
    case 'GATEWAY_INVALID_RESPONSE':
    case 'AUTH_API_ERROR':
      return {
        message: error.message,
        action: 'Tente novamente em alguns instantes',
        code: error.code,
      };

    case 'INTERNAL_DUPLICATE_REQUEST':
      return {
        message: error.message,
        action: 'Verifique se a acao ja foi processada antes de tentar novamente',
        code: error.code,
      };

    case 'CONTACT_NOT_FOUND':
    case 'CATEGORY_NOT_FOUND':
    case 'BANK_ACCOUNT_NOT_FOUND':
    case 'ENTRY_NOT_FOUND':
    case 'EMAIL_TEMPLATE_NOT_FOUND':
    case 'COLLECTION_RULE_NOT_FOUND':
    case 'APPROVAL_RULE_NOT_FOUND':
    case 'ROLE_NOT_FOUND':
    case 'USER_NOT_FOUND':
    case 'NOT_FOUND':
      return { message: error.message, code: error.code };

    case 'CONTACT_DOCUMENT_DUPLICATE':
    case 'USER_ALREADY_LINKED':
    case 'BOLETO_ALREADY_GENERATED':
    case 'RECONCILIATION_ITEM_ALREADY_MATCHED':
      return { message: error.message, code: error.code };

    case 'CATEGORY_HAS_ENTRIES':
      return {
        message: error.message,
        action: 'Desative a categoria em vez de exclui-la',
        code: error.code,
      };

    case 'REPORT_RANGE_TOO_LARGE':
      return {
        message: error.message,
        action: 'Selecione um periodo menor para gerar o relatorio',
        code: error.code,
      };

    case 'STORAGE_LIMIT_EXCEEDED':
      return {
        message: error.message,
        action: 'Remova arquivos antigos ou faca upgrade do plano',
        code: error.code,
      };

    case 'RECONCILIATION_AMOUNT_DIVERGENCE':
    case 'ENTRY_NOT_ELIGIBLE_FOR_RECONCILIATION':
    case 'INVALID_PERIOD_OVERLAP':
    case 'ROLE_SYSTEM_LOCKED':
    case 'AUTH_USER_NOT_FOUND':
    case 'USER_NOT_PROVISIONED':
    case 'ONBOARDING_FAILED':
    case 'GATEWAY_NOT_CONFIGURED':
      return { message: error.message, code: error.code };

    case 'INTERNAL_ERROR':
    default:
      return {
        message: 'Erro inesperado. Tente novamente ou contate o suporte',
        action: `Codigo: ${error.code}`,
        code: error.code,
      };
  }
}
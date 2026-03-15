export type RuleChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export type TriggerEvent =
  | 'BEFORE_DUE'
  | 'ON_DUE'
  | 'AFTER_DUE'
  | 'ON_PAYMENT';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
}

export interface CollectionRule {
  id: string;
  branchId: string;
  name: string;
  channel: RuleChannel;
  triggerEvent: TriggerEvent;
  daysOffset: number;
  active: boolean;
  emailTemplateId: string | null;
  emailTemplate: EmailTemplate | null;
  createdAt: string;
}

export interface CollectionRuleFilters {
  page?: number;
  pageSize?: number;
  active?: boolean;
  channel?: RuleChannel;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

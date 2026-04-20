export type ContentType = 'text' | 'image';

export interface TemplateContent {
  id: string;
  templateId: string;
  contentType: ContentType;
  contentValue: string;
  sortOrder: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  isSelected: boolean;
  createdAt: string;
  contents: TemplateContent[];
}

export interface Target {
  id?: string;
  phoneNumber: string;
  name?: string;
  customFields: Record<string, string>;
  status?: 'pending' | 'sent' | 'failed';
  error?: string;
}

export interface DelayConfig {
  perMessageMin: number;
  perMessageMax: number;
  batchSize: number;
  batchDelayMin: number;
  batchDelayMax: number;
}

export const DEFAULT_DELAY_CONFIG: DelayConfig = {
  perMessageMin: 4000,
  perMessageMax: 8000,
  batchSize: 10,
  batchDelayMin: 10000,
  batchDelayMax: 20000,
};

export interface CRMSyncStats {
  newContacts: number;
  skippedContacts: number;
}

export interface SendingProgress {
  total: number;
  sent: number;
  failed: number;
  currentTarget?: string;
  errors: Array<{ phoneNumber: string; error: string }>;
  crmStats?: CRMSyncStats;
}

export interface BulkSendRequest {
  accountId: string;
  templateIds: string[];
  targets: Target[];
  delayConfig: DelayConfig;
}

export interface CreateTemplateInput {
  name: string;
  contents: Array<{
    contentType: ContentType;
    contentValue: string;
    sortOrder?: number;
  }>;
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  isSelected?: boolean;
  contents?: Array<{
    id?: string;
    contentType: ContentType;
    contentValue: string;
    sortOrder?: number;
  }>;
}

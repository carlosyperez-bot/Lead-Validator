export enum LeadStatus {
  CONTACTABILITY = 'CONTACTABILIDAD',
  INVALID = 'INVÁLIDO',
  SPECIAL = 'ESPECIAL',
  UNKNOWN = 'DESCONOCIDO'
}

export interface RawLead {
  id: string | number;
  phone: string | number;
  date?: string;
  notes: string;
  attempts: number;
  [key: string]: any;
}

export interface ProcessedLead {
  id: string;
  originalPhone: string;
  cleanPhone: string;
  notes: string;
  attempts: number;
  status: LeadStatus;
  reason: string;
  isValidFormat: boolean;
}

export interface AnalysisStats {
  total: number;
  validCount: number;
  invalidCount: number;
  specialCount: number;
  recoverableCount: number;
}

export interface CountryRule {
  name: string;
  code: string;
  regex: RegExp;
  example: string;
}

export interface ClassificationResult {
    status: LeadStatus;
    reason: string;
}

export interface PhoneFormatSearchResult {
  regexString: string;
  explanation: string;
  sources: { title: string; uri: string }[];
}
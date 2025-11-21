import { CountryRule, LeadStatus, ClassificationResult } from '../types';

export const SUPPORTED_COUNTRIES: CountryRule[] = [
  // COLOMBIA: 10 digits. Mobile starts with 3, Fixed starts with 60.
  { name: 'Colombia', code: 'CO', regex: /^(?:(?:\+|00)?57)?([36]\d{9})$/, example: '3123456789 (Móvil) / 6012345678 (Fijo)' },
  
  // ECUADOR: Mobile 10 digits (starts 09), Fixed 9 digits (starts 02-07).
  // Handles optional international code dropping the leading 0.
  { name: 'Ecuador', code: 'EC', regex: /^(?:(?:\+|00)?593)?(?:0?9\d{8}|0?[2-7]\d{7})$/, example: '0991234567' },
  
  // MEXICO: 10 digits strictly (Mobile and Fixed).
  { name: 'México', code: 'MX', regex: /^(?:(?:\+|00)?52)?(\d{10})$/, example: '5512345678' },
  
  // HONDURAS: 8 digits. Mobile starts 3,8,9. Fixed starts 2.
  { name: 'Honduras', code: 'HN', regex: /^(?:(?:\+|00)?504)?([2389]\d{7})$/, example: '91234567' },
  
  // GUATEMALA: 8 digits. Mobile starts 3,4,5. Fixed starts 2,6,7.
  { name: 'Guatemala', code: 'GT', regex: /^(?:(?:\+|00)?502)?([2-7]\d{7})$/, example: '51234567' },
  
  // ARGENTINA: 10 digits strictly (Area Code + Subscriber).
  // Handles the complex +54 9 ... format by stripping and checking specifically for the 10 meaningful digits.
  { name: 'Argentina', code: 'AR', regex: /^(?:(?:(?:\+|00)?54)?(?:9)?(?:0)?)?([1-9]\d{9})$/, example: '11 1234 5678 (Sin 15, 10 dígitos total)' },
  
  // CHILE: 9 digits strictly (Mobile and Fixed since 2016).
  { name: 'Chile', code: 'CL', regex: /^(?:(?:\+|00)?56)?(\d{9})$/, example: '912345678' },
  
  // PARAGUAY: Mobile 9 digits (09...). Fixed 9 digits (02/03...).
  { name: 'Paraguay', code: 'PY', regex: /^(?:(?:\+|00)?595)?(0?9\d{8}|0?[2-8]\d{7})$/, example: '0981234567' },
  
  // URUGUAY: Mobile 9 digits (09...). Fixed 8 digits.
  { name: 'Uruguay', code: 'UY', regex: /^(?:(?:\+|00)?598)?(0?9\d{7}|[24]\d{7})$/, example: '099123456' },
  
  // BRASIL: Mobile 11 digits (DDD + 9 + 8 digits). Fixed 10 digits (DDD + 8 digits).
  { name: 'Brasil', code: 'BR', regex: /^(?:(?:\+|00)?55)?([1-9]{2})(?:9[1-9]\d{7}|[2-5]\d{7})$/, example: '11 91234 5678' },
  
  // PERU: Mobile 9 digits (starts 9). Fixed 9 digits (Lima 01...) or variable. 
  // Focusing on Mobile and Lima Fixed (9 digits total usually) to avoid false negatives.
  { name: 'Perú', code: 'PE', regex: /^(?:(?:\+|00)?51)?(9\d{8}|0?1\d{7})$/, example: '912345678' },
  
  // ESPAÑA: 9 digits strictly (Mobile 6/7, Fixed 8/9).
  { name: 'España', code: 'ES', regex: /^(?:(?:\+|00)?34)?([6789]\d{8})$/, example: '612345678' },
  
  // PORTUGAL: 9 digits strictly (Mobile 9, Fixed 2).
  { name: 'Portugal', code: 'PT', regex: /^(?:(?:\+|00)?351)?([29]\d{8})$/, example: '912345678' },
  
  // ALEMANIA: Mobile (015/016/017...) + 7-9 digits. Fixed varies.
  // Regex focuses on valid Mobile ranges mostly used in leads.
  { name: 'Alemania', code: 'DE', regex: /^(?:(?:\+|00)?49)?(0?1[567]\d{7,9})$/, example: '01701234567' },
];

// Keywords often found in agent notes
const KEYWORDS = {
  // Case 4 & 1: Explicitly Invalid
  INVALID_NUMBER: [
    'no existe', 'fuera de servicio', 'no es abonado', 'número no válido', 'numero no valido',
    'incompleto', 'errado', 'no corresponde', 'imposible conectar', 'linea muerta', 'no en servicio',
    'no habilitado', 'suspendido'
  ],
  // Case 2: Contactability issues (Valid format, but no answer)
  VOICEMAIL_BUSY: [
    'buzón', 'buzon', 'ocupado', 'no contesta', 'sin respuesta', 'contestadora', 'llamada perdida',
    'no atiende', 'timbra', 'cuelga', 'apagar', 'apagado'
  ],
  // Case 3: RCPE / Equivocado (Wrong Person / Registration Error)
  WRONG_PERSON: [
    'equivocado', 'no conoce', 'no es la persona', 'no vive ahí', 'no vive ahi',
    'no trabaja', 'baja', 'ya no pertenece', 'error registro', 'no es la empresa',
    'no titular', 'desconoce', 'no solicitó', 'no solicito', 'equivocada'
  ]
};

export const classifyLead = (
  phone: string,
  attempts: number,
  notes: string,
  countryRule: CountryRule
): ClassificationResult => {
  const cleanPhone = phone.replace(/[^0-9+]/g, ''); // Keep + for international check
  const notesLower = notes.toLowerCase();
  
  // 1. FORMAT VALIDATION
  // Applies the country specific regex.
  const isFormatValid = countryRule.regex.test(cleanPhone);

  // RULE: Invalid format is immediately INVALID.
  if (!isFormatValid) {
    return {
      status: LeadStatus.INVALID,
      reason: 'Formato de teléfono incorrecto (cantidad de dígitos o prefijo inválido)'
    };
  }

  // 2. OPERATOR DENIAL (Fallo de Línea Confirmado)
  // Even if format is valid, if operator says it doesn't exist -> INVALID.
  const isOperatorDenial = KEYWORDS.INVALID_NUMBER.some(k => notesLower.includes(k));
  if (isOperatorDenial) {
    return {
      status: LeadStatus.INVALID,
      reason: 'Operadora/Agente indica explícitamente que el número no existe o está fuera de servicio'
    };
  }

  // 3. RCPE - REGISTRO DE CLIENTE POR ERROR / EQUIVOCADO
  // Format is valid (digits correct), line works, but the person implies wrong contact.
  const isWrongPerson = KEYWORDS.WRONG_PERSON.some(k => notesLower.includes(k));
  if (isWrongPerson) {
    return {
      status: LeadStatus.SPECIAL,
      reason: 'RCPE: Teléfono con formato correcto pero usuario indica EQUIVOCADO o NO ES LA PERSONA.'
    };
  }

  // 4. CONTACTABILIDAD (Default for Valid Format)
  // If we are here: Format is Valid AND No Operator Denial AND No Wrong Person.
  
  const isVoicemailOrBusy = KEYWORDS.VOICEMAIL_BUSY.some(k => notesLower.includes(k));
  
  let reason = 'Formato válido. ';
  if (isVoicemailOrBusy) {
    reason += 'Reportado como Buzón/Ocupado (Problema de Contactabilidad). Sugerido: SMS/WhatsApp.';
  } else if (attempts >= 5) {
    reason += `Sin contacto tras ${attempts} intentos (Fatiga de contacto). Sugerido: Cambio de canal.`;
  } else {
    reason += 'Sin evidencia de error de línea ni rechazo explícito. Potencialmente recuperable.';
  }

  return {
    status: LeadStatus.CONTACTABILITY,
    reason: reason
  };
};
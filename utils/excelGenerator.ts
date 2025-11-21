import * as XLSX from 'xlsx';
import { ProcessedLead, AnalysisStats, LeadStatus } from '../types';

export const generateExcelOutput = (
  leads: ProcessedLead[],
  stats: AnalysisStats,
  narrative: string,
  countryName: string
) => {
  const workbook = XLSX.utils.book_new();

  // 1. TABLA RESUMEN EJECUTIVA
  const summaryData = [
    ["MÉTRICA", "CANTIDAD", "PORCENTAJE", "ACCIÓN SUGERIDA"],
    ["TOTAL REGISTROS ANALIZADOS", stats.total, "100%", "-"],
    ["NUMEROS CON FORMATO VÁLIDO (Contactabilidad)", stats.recoverableCount, `${((stats.recoverableCount / stats.total) * 100).toFixed(2)}%`, "Recontactar vía SMS/WhatsApp/Llamada"],
    ["NUMEROS CON FORMATO INVÁLIDO (Descartar)", stats.invalidCount, `${((stats.invalidCount / stats.total) * 100).toFixed(2)}%`, "Depurar de Base de Datos"],
    ["CASOS ESPECIALES (Problemáticos/Equivocados)", stats.specialCount, `${((stats.specialCount / stats.total) * 100).toFixed(2)}%`, "Revisión Manual / Confirmar Datos"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Style columns width
  summarySheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "1. RESUMEN EJECUTIVO");

  // 2. GRUPO 1 - CONTACTABILIDAD (Para recontacto)
  // Columns: ID, Teléfono, Validación, Razón, Cantidad de toques, Observaciones del agente
  const contactabilityData = leads
    .filter(l => l.status === LeadStatus.CONTACTABILITY)
    .map(l => ({
      "ID": l.id,
      "Teléfono": l.originalPhone,
      "Validación": "✓ VÁLIDO",
      "Razón": l.reason,
      "Cantidad de toques": l.attempts,
      "Observaciones del agente": l.notes
    }));
  const contactabilitySheet = XLSX.utils.json_to_sheet(contactabilityData);
  contactabilitySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, contactabilitySheet, "2. CONTACTABILIDAD");

  // 3. GRUPO 2 - NÚMEROS INVÁLIDOS (Descartar)
  // Columns: ID, Teléfono, Validación, Razón del error, Observaciones del agente
  const invalidData = leads
    .filter(l => l.status === LeadStatus.INVALID)
    .map(l => ({
      "ID": l.id,
      "Teléfono": l.originalPhone,
      "Validación": "✗ INVÁLIDO",
      "Razón del error": l.reason,
      "Observaciones del agente": l.notes
    }));
  const invalidSheet = XLSX.utils.json_to_sheet(invalidData);
  invalidSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 60 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, invalidSheet, "3. INVÁLIDOS");

  // 4. GRUPO 3 - CASOS ESPECIALES/PROBLEMÁTICOS (Revisar)
  // Columns: ID, Teléfono, Tipo de problema, Descripción del problema, Observaciones del agente
  const specialData = leads
    .filter(l => l.status === LeadStatus.SPECIAL)
    .map(l => ({
      "ID": l.id,
      "Teléfono": l.originalPhone,
      "Tipo de problema": "Registro Erróneo / Equivocado",
      "Descripción del problema": l.reason,
      "Observaciones del agente": l.notes
    }));
  const specialSheet = XLSX.utils.json_to_sheet(specialData);
  specialSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 60 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, specialSheet, "4. ESPECIALES");

  // 5. HALLAZGOS CLAVE (Narrativa)
  const narrativeRows = narrative.split('\n').map(line => [line]);
  const narrativeSheet = XLSX.utils.aoa_to_sheet([["ANÁLISIS CUALITATIVO PROSEGUR - HALLAZGOS CLAVE"], ...narrativeRows]);
  narrativeSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, narrativeSheet, "5. HALLAZGOS");

  // 6. LISTADO PARA RECONTACTO (Acción inmediata)
  // Columns: IDs, Teléfono, Observaciones, Total leads recuperables
  // Note: "Total leads" implies a summary stat, but usually lists are row-based. 
  // We will add the total count in the first row header or as a separate column just to be safe, 
  // but typically lists are just the data. The instructions say "Total de leads recuperables" as a field, 
  // which implies a summary at the top or similar. We will put it in the header for clarity.
  
  const recontactData = leads
    .filter(l => l.status === LeadStatus.CONTACTABILITY)
    .map(l => ({
      "ID": l.id,
      "Teléfono": l.originalPhone,
      "Observaciones del agente": l.notes,
      "Estado": "RECUPERABLE"
    }));
    
  const recontactSheet = XLSX.utils.json_to_sheet(recontactData);
  // Add summary info at cell E1 (Just a hack to include the count context)
  XLSX.utils.sheet_add_aoa(recontactSheet, [["Total Recuperables:", stats.recoverableCount]], { origin: "E1" });
  
  recontactSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, recontactSheet, "6. LISTA RECONTACTO");

  // Generate file download
  XLSX.writeFile(workbook, `PROSEGUR_Analisis_Leads_${countryName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
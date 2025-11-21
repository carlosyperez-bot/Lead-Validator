import { GoogleGenAI } from "@google/genai";
import { AnalysisStats, ProcessedLead, PhoneFormatSearchResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const validateCountryFormatWithSearch = async (countryName: string): Promise<PhoneFormatSearchResult | null> => {
  try {
    const ai = getClient();
    // Use gemini-2.5-flash for speed and search capability
    const model = 'gemini-2.5-flash'; 
    
    const prompt = `
      Investiga el plan de numeración oficial actual (2024/2025) para teléfonos MÓVILES (celulares) en: ${countryName}.
      
      TU TAREA:
      1. Identificar cuántos dígitos debe tener un número móvil válido (sin contar el código de país).
      2. Identificar los prefijos móviles comunes.
      3. Generar una Expresión Regular (Regex) en JavaScript que valide estos números.
         - La Regex debe ser flexible con el formato de entrada (espacios, guiones, código de país opcional).
         - La Regex debe capturar estrictamente la longitud correcta de dígitos significativos.
      
      FORMATO DE SALIDA REQUERIDO (Estricto):
      
      REGEX_START
      <Aquí la string de la Regex, ej: ^(\+?57)?3\d{9}$>
      REGEX_END
      
      EXPLANATION_START
      <Breve explicación de 1 frase sobre el formato, ej: "En Colombia son 10 dígitos iniciando por 3.">
      EXPLANATION_END
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1, 
      }
    });

    const text = response.text || '';
    
    // Extract Regex
    const regexMatch = text.match(/REGEX_START\s*([\s\S]*?)\s*REGEX_END/);
    const regexString = regexMatch ? regexMatch[1].trim() : null;

    // Extract Explanation
    const explanationMatch = text.match(/EXPLANATION_START\s*([\s\S]*?)\s*EXPLANATION_END/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : `Formato validado vía web para ${countryName}`;

    // Extract Grounding Sources (URLs)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web.title, uri: c.web.uri }))
      .slice(0, 3); // Top 3 sources

    if (regexString) {
      return {
        regexString,
        explanation,
        sources
      };
    }
    
    return null;

  } catch (error) {
    console.error("Error searching for phone format:", error);
    return null;
  }
};

export const generateExecutiveReport = async (
  stats: AnalysisStats,
  countryName: string,
  problematicSamples: ProcessedLead[]
): Promise<string> => {
  try {
    const ai = getClient();
    
    const sampleNotes = problematicSamples
      .slice(0, 20) 
      .map(l => `- Tel: ${l.cleanPhone} | Obs: "${l.notes}" | Clasificación: ${l.status}`)
      .join('\n');

    const prompt = `
      Actúa como un Analista Senior de Operaciones de Call Center para PROSEGUR (Soluciones B2B de Logística de Valores y Cash Management).
      Hemos analizado una base de datos de leads del mercado: ${countryName}, tipificados erróneamente como "TELÉFONO ERRÓNEO".
      
      TU OBJETIVO:
      Validar si la tipificación de los agentes es correcta o si estamos perdiendo oportunidades de negocio por mala gestión de contactabilidad.
      
      DATOS DEL ANÁLISIS:
      - Total Leads Analizados: ${stats.total}
      - OPORTUNIDADES RECUPERABLES (Contactabilidad): ${stats.recoverableCount} leads (${((stats.recoverableCount/stats.total)*100).toFixed(1)}%) -> Estos números tienen formato válido pero no contestaron.
      - DESCARTES CONFIRMADOS (Inválidos): ${stats.invalidCount} leads (${((stats.invalidCount/stats.total)*100).toFixed(1)}%) -> Formato mal o no existen.
      - REVISIÓN MANUAL (Casos Especiales): ${stats.specialCount} leads (${((stats.specialCount/stats.total)*100).toFixed(1)}%) -> Contestaron pero dijeron "equivocado" u otros motivos.
      
      MUESTRA DE CASOS ESPECIALES/PROBLEMÁTICOS:
      ${sampleNotes}
      
      Genera un "Resumen Ejecutivo de Hallazgos" para la Dirección Comercial de Prosegur.
      Estructura la respuesta estrictamente en estos puntos:
      
      1. DIAGNÓSTICO DE CALIDAD DE DATOS
      Resume la situación. ¿Qué porcentaje de la base es realmente "basura" vs recuperable? ¿El call center está usando "Teléfono Erróneo" como excusa para no insistir?
      
      2. ANÁLISIS DE PATRONES DE ERROR
      Basándote en las muestras y los números, identifica qué está pasando. Ejemplo: "Se observa que los agentes marcan como erróneo números que van a buzón tras pocos intentos" o "Hay un problema de validación en el formulario de registro web".
      
      3. RECOMENDACIONES DE ACCIÓN (Para Recuperar Leads)
      Sugiere 2-3 acciones concretas. Ej: "Activar campaña de SMS/WhatsApp para el ${((stats.recoverableCount/stats.total)*100).toFixed(0)}% de leads recuperables", "Revisar guion de confirmación de identidad para los casos de 'Persona Equivocada'".
      
      Formato: Texto plano profesional, directo, sin markdown complejo. Enfocado a negocio B2B.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo generar el reporte narrativo.";
  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return "Error al generar el reporte con IA. Por favor revise los datos manualmente en las otras pestañas.";
  }
};
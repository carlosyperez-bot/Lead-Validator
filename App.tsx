import React, { useState, useMemo } from 'react';
import CountrySelector from './components/CountrySelector';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { SUPPORTED_COUNTRIES, classifyLead } from './utils/phoneRules';
import { generateExecutiveReport, validateCountryFormatWithSearch } from './services/gemini';
import { generateExcelOutput } from './utils/excelGenerator';
import { CountryRule, RawLead, ProcessedLead, LeadStatus, AnalysisStats, PhoneFormatSearchResult } from './types';
import { ShieldCheck, FileText, Globe, Search } from 'lucide-react';

const App: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<CountryRule | null>(null);
  const [rawFile, setRawFile] = useState<{name: string, data: RawLead[]} | null>(null);
  const [processedLeads, setProcessedLeads] = useState<ProcessedLead[]>([]);
  
  // States for processing steps
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<PhoneFormatSearchResult | null>(null);

  // Computed Stats
  const stats: AnalysisStats | null = useMemo(() => {
    if (processedLeads.length === 0) return null;
    return {
      total: processedLeads.length,
      validCount: processedLeads.filter(l => l.isValidFormat).length,
      invalidCount: processedLeads.filter(l => l.status === LeadStatus.INVALID).length,
      specialCount: processedLeads.filter(l => l.status === LeadStatus.SPECIAL).length,
      recoverableCount: processedLeads.filter(l => l.status === LeadStatus.CONTACTABILITY).length
    };
  }, [processedLeads]);

  const handleCountrySelect = (country: CountryRule) => {
    setSelectedCountry(country);
    setProcessedLeads([]);
    setSearchMetadata(null);
    // If a file is already loaded, we should probably reset or re-prompt, 
    // but for now we just update the selection. User will need to reload file or we trigger re-process manually.
    // To be safe, we clear the processed leads so they hit the button/action again.
  };

  const handleFileLoaded = async (data: RawLead[], fileName: string) => {
    setRawFile({ name: fileName, data });
    if (selectedCountry) {
      await performSearchAndProcess(data, selectedCountry);
    }
  };

  // MAIN LOGIC: Search First, Then Process
  const performSearchAndProcess = async (data: RawLead[], country: CountryRule) => {
    setIsSearching(true);
    setSearchMetadata(null);
    setProcessedLeads([]);

    let finalRule = country;

    try {
        // 1. Google Search for updated format
        const searchResult = await validateCountryFormatWithSearch(country.name);
        
        if (searchResult && searchResult.regexString) {
            try {
                // Create a new rule with the dynamic regex found by AI
                // We assume the AI gives a valid JS regex string inside the tags
                // We wrap in try/catch in case the regex string is malformed
                const dynamicRegex = new RegExp(searchResult.regexString);
                finalRule = {
                    ...country,
                    regex: dynamicRegex,
                    example: `${country.example} (Validado por Google)`
                };
                setSearchMetadata(searchResult);
            } catch (regexError) {
                console.warn("AI returned invalid regex, falling back to static.", regexError);
            }
        }
    } catch (e) {
        console.error("Search failed, proceeding with static rules", e);
    } finally {
        setIsSearching(false);
    }

    // 2. Process the file with the final rule (Static or Dynamic)
    await processLeadsWithRule(data, finalRule);
  };

  const processLeadsWithRule = async (data: RawLead[], rule: CountryRule) => {
    setIsProcessing(true);
    
    // Small delay to allow UI to update from "Searching" to "Processing"
    await new Promise(resolve => setTimeout(resolve, 500));

    const processed = data.map(raw => {
      const result = classifyLead(String(raw.phone), raw.attempts, raw.notes, rule);
      return {
        id: String(raw.id),
        originalPhone: String(raw.phone),
        cleanPhone: String(raw.phone).replace(/[^0-9+]/g, ''),
        notes: raw.notes,
        attempts: raw.attempts,
        status: result.status,
        reason: result.reason,
        isValidFormat: result.status !== LeadStatus.INVALID 
      };
    });

    setProcessedLeads(processed);
    setIsProcessing(false);
  };

  const handleDownload = async () => {
    if (!stats || !selectedCountry) return;
    setIsGeneratingReport(true);

    const samples = processedLeads.filter(l => l.status === LeadStatus.SPECIAL || l.status === LeadStatus.INVALID);
    const narrative = await generateExecutiveReport(stats, selectedCountry.name, samples);
    generateExcelOutput(processedLeads, stats, narrative, selectedCountry.name);

    setIsGeneratingReport(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="text-center mb-12 max-w-2xl">
        <div className="flex justify-center items-center mb-4">
            <div className="bg-yellow-400 p-3 rounded-full shadow-lg">
                <ShieldCheck className="h-8 w-8 text-gray-900" />
            </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Prosegur <span className="text-yellow-500">Lead Validator AI</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Herramienta de auditoría para leads tipificados como "Teléfono Erróneo".
          <br/>
          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-2 inline-block">
            Ahora con Búsqueda en Vivo de Formatos
          </span>
        </p>
      </div>

      {/* Main Workflow */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          
          {/* Step 1 & 2 Container */}
          <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
            <CountrySelector 
              countries={SUPPORTED_COUNTRIES} 
              selected={selectedCountry} 
              onSelect={handleCountrySelect}
              disabled={isProcessing || isSearching}
            />
            
            <div className="w-full max-w-md">
                <FileUpload 
                    onFileLoaded={handleFileLoaded} 
                    disabled={!selectedCountry || isProcessing || isSearching}
                />
                 {rawFile && (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <FileText className="w-4 h-4 mr-1" />
                        {rawFile.name} cargado ({rawFile.data.length} filas)
                    </div>
                )}
            </div>
          </div>

        </div>

        {/* Status Bars */}
        {isSearching && (
           <div className="w-full bg-blue-50 border-t border-blue-100 p-4 flex flex-col items-center justify-center animate-pulse">
                <div className="flex items-center text-blue-700 mb-2">
                    <Globe className="w-5 h-5 mr-2 animate-spin" />
                    <span className="font-semibold">Investigando formato oficial de {selectedCountry?.name} en Google...</span>
                </div>
                <div className="text-xs text-blue-500">Verificando longitud de dígitos y prefijos actuales (2024/2025)</div>
           </div>
        )}

        {isProcessing && (
            <div className="w-full bg-gray-50 border-t border-gray-100 p-4 flex flex-col items-center justify-center">
                 <div className="w-full max-w-md bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2">
                    <div className="bg-yellow-500 h-1.5 rounded-r animate-loading-bar" style={{ width: '100%' }}></div>
                </div>
                <span className="text-sm text-gray-600 font-medium">Analizando {rawFile?.data.length} registros contra reglas validadas...</span>
            </div>
        )}
      </div>

      {/* Search Results Info Block */}
      {searchMetadata && !isSearching && !isProcessing && (
          <div className="w-full max-w-5xl mt-4 bg-white border border-blue-200 rounded-lg p-5 shadow-sm flex items-start gap-4 animate-fade-in">
              <div className="bg-blue-100 p-2 rounded-full">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Formato Validado con Google Search</h4>
                  <p className="text-sm text-gray-700 mt-1">{searchMetadata.explanation}</p>
                  
                  {searchMetadata.sources.length > 0 && (
                      <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Fuentes consultadas:</p>
                          <div className="flex flex-wrap gap-2">
                              {searchMetadata.sources.map((source, idx) => (
                                  <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-50 text-blue-600 px-2 py-1 rounded border border-gray-200 hover:underline hover:bg-blue-50 transition-colors truncate max-w-[200px]">
                                      {source.title}
                                  </a>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Results Dashboard */}
      {processedLeads.length > 0 && !isProcessing && !isSearching && stats && (
        <Dashboard 
          stats={stats} 
          isGeneratingReport={isGeneratingReport}
          onDownload={handleDownload}
          leads={processedLeads}
          searchMetadata={searchMetadata}
        />
      )}

      {/* Footer */}
      <div className="mt-12 text-center text-gray-400 text-sm">
        <p>Prosegur Cash Management Solutions • Powered by Gemini 2.5 & Google Search Grounding</p>
      </div>
      
      <style>{`
        @keyframes loading-bar {
            0% { width: 0%; transform: translateX(-100%); }
            100% { width: 100%; transform: translateX(0%); }
        }
        .animate-loading-bar {
            animation: loading-bar 1.5s infinite ease-in-out;
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
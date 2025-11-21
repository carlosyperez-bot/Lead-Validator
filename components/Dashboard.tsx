import React from 'react';
import { AnalysisStats, LeadStatus, ProcessedLead, PhoneFormatSearchResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Download, Loader2, Globe } from 'lucide-react';

interface Props {
  stats: AnalysisStats;
  isGeneratingReport: boolean;
  onDownload: () => void;
  leads: ProcessedLead[];
  searchMetadata?: PhoneFormatSearchResult | null;
}

const COLORS = {
  [LeadStatus.CONTACTABILITY]: '#16a34a', // Green
  [LeadStatus.INVALID]: '#dc2626', // Red
  [LeadStatus.SPECIAL]: '#eab308', // Yellow
};

const Dashboard: React.FC<Props> = ({ stats, isGeneratingReport, onDownload, leads, searchMetadata }) => {
  
  const chartData = [
    { name: 'Contactabilidad (Recuperable)', value: stats.recoverableCount, color: COLORS[LeadStatus.CONTACTABILITY] },
    { name: 'Inválido (Descartar)', value: stats.invalidCount, color: COLORS[LeadStatus.INVALID] },
    { name: 'Especial (Revisar)', value: stats.specialCount, color: COLORS[LeadStatus.SPECIAL] },
  ].filter(d => d.value > 0);

  return (
    <div className="w-full max-w-4xl mt-8 animate-fade-in">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Contactabilidad</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.recoverableCount}</h3>
              <p className="text-xs text-green-600 font-medium mt-1">
                {((stats.recoverableCount / stats.total) * 100).toFixed(1)}% (Recuperables)
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-100 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inválidos Reales</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.invalidCount}</h3>
              <p className="text-xs text-red-600 font-medium mt-1">
                {((stats.invalidCount / stats.total) * 100).toFixed(1)}% (Formato/Operadora)
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Especial / Equivocado</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.specialCount}</h3>
              <p className="text-xs text-yellow-600 font-medium mt-1">
                {((stats.specialCount / stats.total) * 100).toFixed(1)}% (Revisión)
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col items-center justify-center">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Clasificación Prosegur</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Area */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Diagnóstico Automático</h4>
            
            {searchMetadata && (
                <div className="mb-4 flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100">
                     <Globe className="w-3 h-3 mr-1"/>
                     Reglas auditadas por Google Search
                </div>
            )}

            <p className="text-gray-600 text-sm mb-6">
              Se ha auditado la base de datos buscando discrepancias en la tipificación "Teléfono Erróneo".
            </p>
            
            <div className="space-y-3">
              <div className="bg-green-50 p-3 rounded border border-green-100 text-sm text-green-800">
                <strong>Oportunidad:</strong> {stats.recoverableCount} leads tienen formato válido y parecen ser fallos de contactabilidad (buzón/ocupado). Se recomienda recontactar por WhatsApp o SMS.
              </div>
              {stats.specialCount > 0 && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-sm text-yellow-800">
                  <strong>Atención:</strong> {stats.specialCount} leads contestaron pero indicaron "Número Equivocado". Revisar origen del dato.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={onDownload}
              disabled={isGeneratingReport}
              className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 md:py-4 md:text-lg shadow-lg transform transition hover:-translate-y-0.5 ${isGeneratingReport ? 'opacity-75 cursor-wait' : ''}`}
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Generando Reporte Ejecutivo Prosegur...
                </>
              ) : (
                <>
                  <Download className="-ml-1 mr-3 h-5 w-5" />
                  Descargar Reporte Excel (6 Hojas)
                </>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">
              Genera: Resumen Ejecutivo, Listas de Recontacto y Análisis de Calidad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
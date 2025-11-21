import React, { useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawLead } from '../types';

interface Props {
  onFileLoaded: (data: RawLead[], fileName: string) => void;
  disabled: boolean;
}

const FileUpload: React.FC<Props> = ({ onFileLoaded, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Read as array of arrays first to find headers
      
      if (data.length === 0) return;

      // Naive column mapping
      // Assuming rows are: ID, Teléfono, Fecha, Observaciones, Cantidad de toques
      // We try to map by header name, or fallback to index
      const headers = (data[0] as string[]).map(h => h.toString().toLowerCase().trim());
      
      // Map logic
      const idIdx = headers.findIndex(h => h.includes('id'));
      const phoneIdx = headers.findIndex(h => h.includes('tel') || h.includes('cel'));
      const dateIdx = headers.findIndex(h => h.includes('fecha'));
      const notesIdx = headers.findIndex(h => h.includes('obs') || h.includes('comentario'));
      const attemptsIdx = headers.findIndex(h => h.includes('toque') || h.includes('intento') || h.includes('cantidad'));

      const rows = data.slice(1).map((row: any) => {
        return {
            id: idIdx > -1 ? row[idIdx] : row[0],
            phone: phoneIdx > -1 ? String(row[phoneIdx]) : String(row[1]),
            date: dateIdx > -1 ? row[dateIdx] : '',
            notes: notesIdx > -1 ? (row[notesIdx] || '') : (row[3] || ''),
            attempts: attemptsIdx > -1 ? Number(row[attemptsIdx] || 0) : Number(row[4] || 0),
        } as RawLead;
      }).filter(r => r.phone && r.phone !== 'undefined'); // Basic filter

      onFileLoaded(rows, file.name);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div 
      className={`w-full max-w-md mt-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        disabled ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-300 hover:border-yellow-500 hover:bg-yellow-50 cursor-pointer'
      }`}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center">
        {disabled ? (
           <FileSpreadsheet className="h-12 w-12 text-gray-300 mb-3" />
        ) : (
           <Upload className="h-12 w-12 text-yellow-500 mb-3" />
        )}
        <p className="text-sm font-medium text-gray-700">
          {disabled ? 'Selecciona un país primero' : '2. Sube el archivo Excel (.xlsx)'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Debe contener: ID, Teléfono, Observaciones, Toques
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
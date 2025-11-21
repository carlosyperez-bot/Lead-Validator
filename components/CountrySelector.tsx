import React from 'react';
import { CountryRule, LeadStatus } from '../types';
import { MapPin } from 'lucide-react';

interface Props {
  countries: CountryRule[];
  selected: CountryRule | null;
  onSelect: (country: CountryRule) => void;
  disabled?: boolean;
}

const CountrySelector: React.FC<Props> = ({ countries, selected, onSelect, disabled }) => {
  return (
    <div className="w-full max-w-md">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        1. Selecciona el país a analizar
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <select
          disabled={disabled}
          className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border shadow-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
          value={selected?.name || ''}
          onChange={(e) => {
            const country = countries.find(c => c.name === e.target.value);
            if (country) onSelect(country);
          }}
        >
          <option value="" disabled>Seleccionar país...</option>
          {countries.map((c) => (
            <option key={c.code} value={c.name}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <p className="mt-2 text-sm text-gray-500">
          Formato esperado: <span className="font-mono font-bold text-gray-700">{selected.example}</span>
        </p>
      )}
    </div>
  );
};

export default CountrySelector;
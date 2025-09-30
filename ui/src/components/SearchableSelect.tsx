import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from './Icons';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  placeholder: string;
  onSelect: (value: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  placeholder,
  onSelect,
  onClear,
  disabled = false,
  label,
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected option
  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.id === value);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [value, options]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.sublabel && option.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
    onSelect(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedOption(null);
    setSearchTerm('');
    onClear?.();
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className={`
            relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default
            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}
          `}
        >
          <span className="block truncate">
            {selectedOption ? (
              <span>
                <span className="font-medium">{selectedOption.label}</span>
                {selectedOption.sublabel && (
                  <span className="text-gray-500 ml-2">- {selectedOption.sublabel}</span>
                )}
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </span>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            {selectedOption && onClear ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="mr-2 p-1 rounded-full hover:bg-gray-100 pointer-events-auto"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400" />
              </button>
            ) : null}
            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhum resultado encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                    ${selectedOption?.id === option.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-sm text-gray-500">{option.sublabel}</div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
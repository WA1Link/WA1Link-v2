import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface MultiDropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiDropdownProps {
  options: MultiDropdownOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** Hide the "All" / clear-all action inside the menu. */
  hideClearAll?: boolean;
}

export const MultiDropdown: React.FC<MultiDropdownProps> = ({
  options,
  values,
  onChange,
  placeholder = 'Select options',
  label,
  error,
  disabled = false,
  className = '',
  hideClearAll = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(values), [values]);
  const selectedLabels = useMemo(
    () => options.filter((o) => selectedSet.has(o.value)).map((o) => o.label),
    [options, selectedSet]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-whatsapp-light focus:border-whatsapp-light
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        <span className={`block truncate pr-6 ${selectedLabels.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
          {selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length <= 2
              ? selectedLabels.join(', ')
              : `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && createPortal(
        <div ref={menuRef} style={menuStyle} className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {!hideClearAll && values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-left text-xs text-gray-500 border-b hover:bg-gray-50"
            >
              ✕ Clear
            </button>
          )}
          {options.length === 0 && (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">No options</div>
          )}
          {options.map((option) => {
            const checked = selectedSet.has(option.value);
            return (
              <label
                key={option.value}
                className={`
                  flex items-center gap-2 w-full px-3 py-2 text-sm
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                  ${checked ? 'bg-whatsapp-light bg-opacity-10 text-whatsapp-dark' : 'text-gray-900'}
                `}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={option.disabled}
                  onChange={() => !option.disabled && toggle(option.value)}
                  className="rounded"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
        </div>,
        document.body
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

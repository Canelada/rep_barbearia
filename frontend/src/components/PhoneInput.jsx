'use client'
import { useState, useEffect } from 'react';
import { formatarTelefone } from '@/utils/formatters';

export default function PhoneInput({ value, onChange, className, placeholder, required, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setDisplayValue(formatarTelefone(value || ''));
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;

    // Remove tudo que não é número
    let numbersOnly = inputValue.replace(/\D/g, '');

    // Limita a 11 dígitos (DDD + 9 dígitos)
    const limitedNumbers = numbersOnly.slice(0, 11);

    // Formata e atualiza o display
    const formatted = formatarTelefone(limitedNumbers);
    setDisplayValue(formatted);

    // Valida o formato
    const regex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    const isValidFormat = formatted === '' || regex.test(formatted);
    setIsValid(isValidFormat);

    // Sempre chama onChange - deixa a validação para o backend ou form
    onChange(formatted || '');
  };

  const handleKeyDown = (e) => {
    // Permite: backspace, delete, tab, escape, enter
    if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
        // Permite: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Permite: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    
    // Garante que é um número
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const inputClassName = `${className} ${
    !isValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
  }`;

  return (
    <div>
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        placeholder={placeholder || '(00) 00000-0000'}
        required={required}
        {...props}
      />
      {!isValid && displayValue && (
        <p className="text-red-500 text-xs mt-1">
          Use o formato: (00) 00000-0000
        </p>
      )}
    </div>
  );
}
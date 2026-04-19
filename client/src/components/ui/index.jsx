/**
 * FSV Capital — Reusable UI Components v2
 * ─────────────────────────────────────────────────────────────
 * Clean, composable components used across all form sections.
 * All components accept a `error` prop for validation display.
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useRef } from 'react';

// ── Field wrapper ─────────────────────────────────────────────
export function Field({ label, required, hint, error, charCount, maxChars, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
          {label}
          {required && <span className="text-amber-500 text-[10px] font-semibold">*</span>}
        </label>
        {maxChars && (
          <span className={`text-[10px] font-mono ${charCount > maxChars * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
            {charCount || 0} / {maxChars}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400 leading-relaxed">{hint}</p>}
      {children}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1.5 animate-[fadeIn_0.2s_ease]">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = 'text', error, disabled }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all
        placeholder:text-gray-300 bg-gray-50 text-gray-900
        focus:bg-white focus:ring-2 focus:ring-amber-100
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error
          ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
          : 'border-gray-200 focus:border-amber-400'}
      `}
    />
  );
}

// ── Textarea with char counter ────────────────────────────────
export function Textarea({ value, onChange, placeholder, rows = 4, maxChars, error }) {
  const [count, setCount] = useState((value || '').length);
  return (
    <>
      <textarea
        value={value || ''}
        onChange={e => { onChange(e.target.value); setCount(e.target.value.length); }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxChars ? maxChars + 50 : undefined} // soft limit with buffer
        className={`
          w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all resize-y
          placeholder:text-gray-300 bg-gray-50 text-gray-900 leading-relaxed
          focus:bg-white focus:ring-2 focus:ring-amber-100
          ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-amber-400'}
        `}
      />
      {maxChars && (
        <span className={`text-[10px] font-mono text-right -mt-0.5 ${count > maxChars * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
          {count} / {maxChars}
        </span>
      )}
    </>
  );
}

// ── Select dropdown ───────────────────────────────────────────
export function Select({ value, onChange, options, placeholder = 'Select...', error }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`
        w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all cursor-pointer
        bg-gray-50 text-gray-900 appearance-none
        focus:bg-white focus:ring-2 focus:ring-amber-100
        ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-amber-400'}
      `}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── Multi-select chips ────────────────────────────────────────
export function ChipSelect({ options, value = [], onChange, error }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`
              px-3 py-1.5 text-xs rounded-full border transition-all cursor-pointer
              ${selected
                ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                : 'border-gray-200 text-gray-500 hover:border-amber-200 hover:text-gray-700'}
            `}
          >
            {selected && <span className="mr-1 text-amber-500">✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Radio pills ───────────────────────────────────────────────
export function RadioPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`
            px-4 py-2 text-xs rounded-md border transition-all cursor-pointer
            ${value === opt
              ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
              : 'border-gray-200 text-gray-500 hover:border-amber-200 hover:text-gray-700'}
          `}
        >
          {value === opt && <span className="mr-1.5 text-amber-500">●</span>}
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── File upload zone ──────────────────────────────────────────
export function UploadZone({ label, required, hint, accept, value, onChange, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    // PDF-only enforcement for pitch deck
    if (required && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Pitch deck must be a PDF file. Please upload a .pdf document.');
      return;
    }
    onChange(file);
  };

  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${value ? 'border-green-300 bg-green-50/50'
            : dragging ? 'border-amber-300 bg-amber-50/50'
            : error ? 'border-red-200 bg-red-50/30'
            : 'border-gray-200 bg-gray-50/50 hover:border-amber-200 hover:bg-amber-50/30'}
        `}
      >
        <div className="text-3xl mb-2">{value ? '✓' : '↑'}</div>
        {value ? (
          <>
            <p className="text-sm font-medium text-green-700">File attached</p>
            <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
              📄 {value.name}
            </p>
            <p className="text-[10px] text-green-500 mt-1">Click to replace</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Drop file here or click to browse</p>
            <p className="text-[11px] text-gray-400 mt-1">{hint || accept?.replace(/\./g, '').toUpperCase()}</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </Field>
  );
}

// ── Range slider ──────────────────────────────────────────────
export function RangeSlider({ label, value, onChange, min, max, step = 1, unit = '', hint }) {
  const display = parseFloat(value || min);
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-4 mt-1">
        <input
          type="range"
          min={min} max={max} step={step}
          value={display}
          onChange={e => onChange(e.target.value)}
          className="flex-1 accent-amber-400 h-1 cursor-pointer"
        />
        <span className="font-mono text-sm font-medium text-amber-600 min-w-[52px] text-right">
          {Number(display).toLocaleString()}{unit}
        </span>
      </div>
    </Field>
  );
}

// ── Section card wrapper ──────────────────────────────────────
export function SectionCard({ eyebrow, title, desc, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-7 mb-5 hover:shadow-md transition-shadow">
      <div className="mb-5 pb-4 border-b border-gray-50">
        <p className="text-[10px] font-semibold text-amber-500 tracking-[0.14em] uppercase mb-1">{eyebrow}</p>
        <h2 className="text-xl font-serif text-gray-900 leading-tight">{title}</h2>
        {desc && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Alert banner ──────────────────────────────────────────────
export function Alert({ type = 'warn', children }) {
  const styles = {
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    ok:   'bg-green-50 border-green-200 text-green-800'
  };
  const icons = { warn: '⚠', info: 'ℹ', ok: '✓' };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs leading-relaxed mb-4 ${styles[type]}`}>
      <span>{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

// ── Score bar (for score breakdown) ──────────────────────────
export function ScoreBar({ label, score, max, animate = true }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-1 rounded-full bg-amber-400 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-lg font-medium text-gray-800">{score}</span>
      <span className="text-xs text-gray-400"> / {max}</span>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

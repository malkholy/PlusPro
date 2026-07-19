import React, { useState, useRef, useEffect } from 'react';

export default function MacroInput({ value, onChange, macros = [], ...props }) {
  const [context, setContext] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  // When value changes from outside, if it somehow invalidates context, we might want to clear it,
  // but usually it's driven by our own inputs.

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(e);

    const cursor = e.target.selectionStart;
    const prefix = val.substring(0, cursor);
    const match = prefix.match(/=([a-zA-Z0-9_]*)$/);

    if (match) {
      setContext({
        filterText: match[1],
        startIndex: match.index,
        cursorPos: cursor
      });
      setActiveIndex(0);
    } else {
      setContext(null);
    }
  };

  const filteredMacros = context 
    ? macros.filter(m => m.toLowerCase().includes(context.filterText.toLowerCase()))
    : [];

  const handleSelect = (macroName) => {
    if (!context) return;
    const val = value || '';
    const newValue = val.substring(0, context.startIndex + 1) + macroName + val.substring(context.cursorPos);
    
    onChange({ target: { value: newValue } });
    setContext(null);
    
    // Attempt to restore focus after a short delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // optionally set cursor position to end of inserted macro
        const newCursor = context.startIndex + 1 + macroName.length;
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleKeyDown = (e) => {
    if (!context) {
      if (props.onKeyDown) props.onKeyDown(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredMacros.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredMacros.length) % filteredMacros.length);
    } else if (e.key === 'Enter') {
      if (filteredMacros.length > 0) {
        e.preventDefault();
        handleSelect(filteredMacros[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setContext(null);
    } else {
      if (props.onKeyDown) props.onKeyDown(e);
    }
  };

  return (
    <div style={{ position: 'relative', width: props.style?.width || '100%' }}>
      <input
        {...props}
        ref={inputRef}
        value={value || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {context && filteredMacros.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: '#fff',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: 200,
          overflowY: 'auto',
          zIndex: 9999,
          minWidth: 200
        }}>
          {filteredMacros.map((m, idx) => (
            <div
              key={m}
              onClick={() => handleSelect(m)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                background: idx === activeIndex ? '#EFF6FF' : '#fff',
                color: idx === activeIndex ? '#1D4ED8' : '#334155',
                borderBottom: '1px solid #F1F5F9'
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span style={{ color: '#94A3B8', marginRight: 4 }}>=</span>{m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

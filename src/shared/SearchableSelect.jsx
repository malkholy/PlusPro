import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ value, options, onChange, placeholder = '', style = {}, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, width: 0, goesUp: false });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const optionRefs = useRef([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 250; 
      const goesUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      
      setCoords({
        left: rect.left,
        top: goesUp ? rect.top - dropdownHeight : rect.bottom,
        width: Math.max(rect.width, 200),
        goesUp
      });
    }
  };

  useLayoutEffect(() => {
    if (open) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [open]);

  const selectedOpt = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOpt ? selectedOpt.label : '';

  const filtered = options.filter(o => 
    String(o.label).toLowerCase().includes(search.toLowerCase()) || 
    String(o.value).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        onChange('');
        setOpen(false);
      } else if (filtered[highlightedIndex - 1]) {
        onChange(filtered[highlightedIndex - 1].value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        className="searchable-trigger"
        tabIndex={0}
        onClick={() => { 
          if (disabled) return;
          if (!open) {
            setSearch('');
            setHighlightedIndex(0);
          }
          setOpen(!open); 
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (!open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setSearch('');
            setHighlightedIndex(0);
            setOpen(true);
          }
        }}
        style={{ 
          width: '100%', 
          padding: '4px 8px', 
          border: '1px solid var(--border)', 
          borderRadius: '4px', 
          background: 'var(--bg)', 
          cursor: disabled ? 'not-allowed' : 'pointer', 
          opacity: disabled ? 0.6 : 1,
          minHeight: '28px', 
          display: 'flex', 
          alignItems: 'center',
          overflow: 'hidden', 
          whiteSpace: 'nowrap', 
          textOverflow: 'ellipsis',
          fontSize: '13px',
          color: displayLabel ? 'var(--text)' : 'var(--muted)'
        }}
      >
        {displayLabel || placeholder}
      </div>
      
      {open && createPortal(
        <div 
          ref={dropdownRef}
          style={{ 
            position: 'fixed', 
            top: coords.goesUp ? undefined : coords.top + 2, 
            bottom: coords.goesUp ? window.innerHeight - coords.top + 2 : undefined,
            left: coords.left, 
            width: coords.width, 
            background: 'var(--bg)', 
            border: '1px solid var(--border)', 
            borderRadius: '4px', 
            zIndex: 999999, 
            maxHeight: '250px', 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <input 
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                setOpen(false);
              } else {
                handleKeyDown(e);
              }
            }}
            placeholder="Search..."
            style={{ 
              padding: '8px', 
              borderBottom: '1px solid var(--border)', 
              borderTop: 'none', 
              borderLeft: 'none', 
              borderRight: 'none', 
              background: 'var(--surface)', 
              color: 'var(--text)', 
              outline: 'none',
              fontSize: '13px'
            }}
          />
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            <div
              ref={el => optionRefs.current[0] = el}
              onClick={() => { onChange(''); setOpen(false); }}
              onMouseEnter={() => setHighlightedIndex(0)}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontSize: '13px',
                background: highlightedIndex === 0 ? 'var(--soft)' : 'transparent'
              }}
            >
              —
            </div>
            {filtered.length === 0 ? <div style={{ padding: '6px 8px', color: 'var(--muted)', fontSize: '13px' }}>No results</div> : null}
            {filtered.map((opt, i) => (
              <div
                key={i}
                ref={el => optionRefs.current[i + 1] = el}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={() => setHighlightedIndex(i + 1)}
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  color: 'var(--text)',
                  background: highlightedIndex === i + 1 ? 'var(--soft)' : 'transparent'
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

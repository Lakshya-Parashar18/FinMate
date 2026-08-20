import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaCheck, FaSearch } from 'react-icons/fa';
import './CustomSelect.css';

export default function CustomSelect({
  options = [],
  value,
  onChange,
  name,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  icon: LeadIcon,
  popoverMinWidth = null,
  searchable
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const textInputRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 200 });

  // Normalize options array: convert plain strings to { value, label }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { 
        value: opt.value, 
        label: opt.label || opt.value, 
        displayLabel: opt.displayLabel || opt.label || opt.value,
        icon: opt.icon 
      };
    }
    return { value: String(opt), label: String(opt), displayLabel: String(opt) };
  });

  const showSearch = searchable !== undefined ? searchable : normalizedOptions.length > 3;

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  // Filter options based on user typing
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate popover fixed position with zoom compensation
  const updatePosition = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    const zoomFactor = window.innerWidth > 768 ? 0.9 : 1.0;

    const popoverHeight = Math.min(filteredOptions.length * 42 + 60, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = showAbove
      ? (rect.top / zoomFactor) - (popoverHeight / zoomFactor) - 6
      : (rect.bottom / zoomFactor) + 6;

    const left = rect.left / zoomFactor;
    const width = rect.width / zoomFactor;

    setPopoverPos({
      top: Math.max(10, top),
      left,
      width
    });
  }, [filteredOptions.length]);

  // Recalculate position when open or on scroll/resize/search
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updatePosition, searchTerm]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-focus input inside popover when opened
  useEffect(() => {
    if (isOpen && textInputRef.current) {
      setTimeout(() => {
        if (textInputRef.current) textInputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelectOption = (optVal) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: optVal
        }
      };
      onChange(syntheticEvent, optVal);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleWrapperClick = () => {
    if (disabled) return;
    setIsOpen(prev => {
      if (!prev) setSearchTerm('');
      return !prev;
    });
  };

  const displayText = selectedOption ? (selectedOption.displayLabel || selectedOption.label) : placeholder;

  const popoverElement = isOpen && (
    <div
      ref={popoverRef}
      className="custom-select-popover portal-popover"
      data-lenis-prevent
      style={{
        position: 'fixed',
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
        width: `${popoverMinWidth ? Math.max(popoverPos.width, popoverMinWidth) : popoverPos.width}px`,
        zIndex: 99999999
      }}
    >
      {showSearch && (
        <div className="custom-select-search-box">
          <FaSearch className="custom-select-search-icon" />
          <input
            ref={textInputRef}
            type="text"
            className="custom-select-search-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search options..."
          />
        </div>
      )}

      <div
        className="custom-select-options-list"
        data-lenis-prevent
        onWheel={(e) => e.stopPropagation()}
      >
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className={`custom-select-option-item ${isSelected ? 'selected' : ''}`}
              >
                <div className="custom-select-option-label-group">
                  {opt.icon && <span className="custom-select-option-icon">{opt.icon}</span>}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <FaCheck className="custom-select-check-icon" />}
              </button>
            );
          })
        ) : (
          <div className="custom-select-no-results">
            No matching options
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${disabled ? 'disabled' : ''} ${className}`}
    >
      <div
        ref={inputWrapperRef}
        className={`custom-select-input-wrapper ${isOpen ? 'active' : ''}`}
        onClick={handleWrapperClick}
      >
        <div className="custom-select-value-wrapper">
          {LeadIcon && <LeadIcon className="custom-select-lead-icon" />}
          {selectedOption && selectedOption.icon && (
            <span className="custom-select-lead-icon">{selectedOption.icon}</span>
          )}
          <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
            {displayText}
          </span>
        </div>

        <FaChevronDown className={`custom-select-caret ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && createPortal(popoverElement, document.body)}
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaCaretDown } from 'react-icons/fa';
import './CustomDatePicker.css';

const parseValidDate = (val, mode) => {
  if (!val) return null;
  const format = mode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
  const d = dayjs(val, format);
  return d.isValid() ? d : null;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function CustomDatePicker({ value, onChange, label, placeholder, mode = 'date' }) {
  const defaultPlaceholder = placeholder || (mode === 'month' ? 'yyyy-mm' : 'dd-mm-yyyy');
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseValidDate(value, mode);

  const [viewDate, setViewDate] = useState(() => selectedDate || dayjs());
  // viewMode: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState(mode === 'month' ? 'months' : 'days');
  const [yearPageStart, setYearPageStart] = useState(() => (selectedDate || dayjs()).year() - 5);

  const containerRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Sync view date if value changes
  useEffect(() => {
    const validVal = parseValidDate(value, mode);
    if (validVal) {
      setViewDate(validVal);
      setYearPageStart(validVal.year() - 5);
    }
  }, [value, mode]);

  // Reset viewMode when opened
  useEffect(() => {
    if (isOpen) {
      setViewMode(mode === 'month' ? 'months' : 'days');
    }
  }, [isOpen, mode]);

  // Calculate popover fixed position relative to viewport
  const updatePosition = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    const popoverHeight = 330;
    const popoverWidth = 280;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = showAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;
    let left = rect.right - popoverWidth;
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));

    setPopoverPos({
      top: Math.max(10, top),
      left
    });
  }, []);

  // Recalculate position when open or on scroll/resize
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
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeViewDate = (viewDate && viewDate.isValid()) ? viewDate : dayjs();

  const handlePrev = () => {
    if (viewMode === 'days') {
      setViewDate(prev => prev.subtract(1, 'month'));
    } else if (viewMode === 'months') {
      setViewDate(prev => prev.subtract(1, 'year'));
    } else if (viewMode === 'years') {
      setYearPageStart(prev => prev - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      setViewDate(prev => prev.add(1, 'month'));
    } else if (viewMode === 'months') {
      setViewDate(prev => prev.add(1, 'year'));
    } else if (viewMode === 'years') {
      setYearPageStart(prev => prev + 12);
    }
  };

  const handleTitleClick = () => {
    if (viewMode === 'days') {
      setViewMode('months');
    } else if (viewMode === 'months') {
      setYearPageStart(activeViewDate.year() - 5);
      setViewMode('years');
    } else {
      setViewMode(mode === 'month' ? 'months' : 'days');
    }
  };

  const handleSelectDate = (dateObj) => {
    if (onChange) {
      const formatted = mode === 'month' ? dateObj.format('YYYY-MM') : dateObj.format('YYYY-MM-DD');
      onChange(formatted);
    }
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIdx) => {
    const targetDate = activeViewDate.month(monthIdx);
    setViewDate(targetDate);
    if (mode === 'month') {
      if (onChange) onChange(targetDate.format('YYYY-MM'));
      setIsOpen(false);
    } else {
      setViewMode('days');
    }
  };

  const handleSelectYear = (selectedYear) => {
    const targetDate = activeViewDate.year(selectedYear);
    setViewDate(targetDate);
    setViewMode('months');
  };

  const handleToday = () => {
    const today = dayjs();
    setViewDate(today);
    if (onChange) {
      const formatted = mode === 'month' ? today.format('YYYY-MM') : today.format('YYYY-MM-DD');
      onChange(formatted);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (onChange) onChange('');
    setIsOpen(false);
  };

  // Generate calendar days matrix
  const startOfMonth = activeViewDate.startOf('month');
  const startDayOfWeek = startOfMonth.day();
  const daysInMonth = activeViewDate.daysInMonth();

  const prevMonth = activeViewDate.subtract(1, 'month');
  const prevMonthDays = prevMonth.daysInMonth();
  const calendarCells = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonth.date(prevMonthDays - i);
    calendarCells.push({ date, isCurrentMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const date = activeViewDate.date(i);
    calendarCells.push({ date, isCurrentMonth: true });
  }

  const remainingCells = 42 - calendarCells.length;
  const nextMonth = activeViewDate.add(1, 'month');
  for (let i = 1; i <= remainingCells; i++) {
    const date = nextMonth.date(i);
    calendarCells.push({ date, isCurrentMonth: false });
  }

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let displayText = defaultPlaceholder;
  if (selectedDate) {
    displayText = mode === 'month' ? selectedDate.format('MMMM YYYY') : selectedDate.format('MMM DD, YYYY');
  }

  // Generate 12-year list for 'years' viewMode
  const yearsList = [];
  for (let i = 0; i < 12; i++) {
    yearsList.push(yearPageStart + i);
  }

  const getTitleText = () => {
    if (viewMode === 'years') {
      return `${yearsList[0]} - ${yearsList[11]}`;
    }
    if (viewMode === 'months') {
      return `${activeViewDate.format('YYYY')}`;
    }
    return activeViewDate.format('MMMM YYYY');
  };

  const popoverElement = isOpen && (
    <div
      ref={popoverRef}
      className="custom-datepicker-popover portal-popover"
      style={{
        position: 'fixed',
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
        zIndex: 99999999
      }}
    >
      {/* Header Controls */}
      <div className="cdp-header">
        <button type="button" onClick={handlePrev} className="cdp-nav-btn" title="Previous">
          <FaChevronLeft />
        </button>
        <button type="button" onClick={handleTitleClick} className="cdp-title-btn" title="Click to change month/year">
          <span>{getTitleText()}</span>
          <FaCaretDown className={`cdp-caret ${viewMode !== 'days' ? 'rotated' : ''}`} />
        </button>
        <button type="button" onClick={handleNext} className="cdp-nav-btn" title="Next">
          <FaChevronRight />
        </button>
      </div>

      {viewMode === 'years' ? (
        /* Years Picker Grid */
        <div className="cdp-month-grid">
          {yearsList.map(y => {
            const isSelected = selectedDate && selectedDate.year() === y;
            const isCurrentYear = dayjs().year() === y;

            return (
              <button
                key={y}
                type="button"
                onClick={() => handleSelectYear(y)}
                className={`cdp-month-cell ${isSelected ? 'selected' : ''} ${isCurrentYear ? 'today' : ''}`}
              >
                {y}
              </button>
            );
          })}
        </div>
      ) : viewMode === 'months' ? (
        /* Month Picker Grid */
        <div className="cdp-month-grid">
          {MONTH_NAMES.map((monthName, idx) => {
            const isSelected = selectedDate && selectedDate.year() === activeViewDate.year() && selectedDate.month() === idx;
            const isCurrentMonth = dayjs().year() === activeViewDate.year() && dayjs().month() === idx;

            return (
              <button
                key={monthName}
                type="button"
                onClick={() => handleSelectMonth(idx)}
                className={`cdp-month-cell ${isSelected ? 'selected' : ''} ${isCurrentMonth ? 'today' : ''}`}
              >
                {monthName}
              </button>
            );
          })}
        </div>
      ) : (
        /* Day Picker Grid */
        <>
          <div className="cdp-weekdays">
            {weekDays.map(day => (
              <span key={day} className="cdp-weekday">{day}</span>
            ))}
          </div>

          <div className="cdp-grid">
            {calendarCells.map(({ date, isCurrentMonth }, idx) => {
              const isSelected = selectedDate && date.isSame(selectedDate, 'day');
              const isToday = date.isSame(dayjs(), 'day');

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={`cdp-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                >
                  {date.date()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Footer Actions */}
      <div className="cdp-footer">
        <button type="button" onClick={handleClear} className="cdp-footer-btn clear">
          Clear
        </button>
        <button type="button" onClick={handleToday} className="cdp-footer-btn today">
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="custom-datepicker-container">
      {label && <label className="custom-datepicker-label">{label}</label>}

      <div
        ref={inputWrapperRef}
        className={`custom-datepicker-input-wrapper ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className="custom-datepicker-value">{displayText}</span>
        <FaCalendarAlt className="custom-datepicker-icon" />
      </div>

      {isOpen && createPortal(popoverElement, document.body)}
    </div>
  );
}

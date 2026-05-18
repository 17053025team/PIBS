import React, { createContext, useContext, useState, useEffect } from 'react';

interface BookingContextType {
  startDate: string;
  endDate: string;
  days: number;
  setPeriod: (start: string, end: string) => void;
  isValid: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const [startDate, setStartDate] = useState(localStorage.getItem('summit_start') || '');
  const [endDate, setEndDate] = useState(localStorage.getItem('summit_end') || '');
  const [days, setDays] = useState(0);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      setDays(diffDays);
      localStorage.setItem('summit_start', startDate);
      localStorage.setItem('summit_end', endDate);
    } else {
      setDays(0);
    }
  }, [startDate, endDate]);

  const setPeriod = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const isValid = !!(startDate && endDate && new Date(endDate) >= new Date(startDate));

  return (
    <BookingContext.Provider value={{ startDate, endDate, days, setPeriod, isValid }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
};

import React, { useRef } from 'react';

export function FilterBar({ searchQuery, setSearchQuery, selectedDate, setSelectedDate }) {
  const dateInputRef = useRef(null);

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center mb-6">
      <div className="relative w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search details..."
          value={searchQuery || ''}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
        />
      </div>

      <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1.5 shadow-sm w-full sm:w-auto h-[42px]">
        <button onClick={handlePrevDay} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="Previous Day">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={handleToday} className="px-3 py-1 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors mx-1">
          Today
        </button>
        <button onClick={handleNextDay} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="Next Day">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        
        <div className="w-px h-5 bg-slate-200 mx-2"></div>
        
        <div 
          className="relative flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group"
          onClick={() => dateInputRef.current?.showPicker && dateInputRef.current.showPicker()}
        >
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-sm font-bold text-slate-800 tracking-wide">{formatDate(selectedDate)}</span>
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

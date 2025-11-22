import { useState, useMemo } from 'react';
import {
  getMonthData,
  getMonthStats,
  formatLargePnL
} from '../data/mockCalendarData';
import YearView from './YearView';
import { MOCK_CALENDAR_DATA } from '../data/mockCalendarData'; 
import TradeDetailModal from '../TradeDetailModal/TradeDetailModal';
import TradeDetails from './TradeDetails';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function TradingCalendar({ onDayClick, setAppDate, appDate }) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 3, 1));
  const [isDarkMode, setIsDarkMode] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Load month data
  const monthData = useMemo(() => getMonthData(year, month), [year, month]);
  const stats = useMemo(() => getMonthStats(year, month), [year, month]);

  const { totalPnL, wins, losses, breakeven, tradingDays, winRate, profitFactor, weeklyStats } = stats;

  // Build calendar structure
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const w = days.slice(i, i + 7);
    while (w.length < 7) w.push(null);
    weeks.push(w);
  }

  const getCellClass = (day) => {
    const d = monthData[day];
    if (!d) return 'day-cell';
    if (d.isLoss) return 'day-cell red-bg';
    if (d.pnlValue > 0) return 'day-cell green-bg';
    return 'day-cell blue-bg';
  };

  const getPnLClass = (data) => {
    if (data.isLoss) return 'pnl-value red';
    if (data.pnlValue > 0) return 'pnl-value green';
    return 'pnl-value blue';
  };

  const formatDisplayPnL = (pnl) => {
    if (pnl === "0") return '$0';
    return pnl.startsWith('-') ? `-$${pnl.slice(1)}` : `$${pnl}`;
  };

  const [viewMode, setViewMode] = useState("month"); 
  
  const [theme, setTheme] = useState("dark"); // "dark" or "light"

  const toggleTheme = () => {
  if (theme === "dark") {
    setTheme("light");
    document.body.classList.add("light-mode");
  } else {
    setTheme("dark");
    document.body.classList.remove("light-mode");
  }
};

const [selectedDayData, setSelectedDayData] = useState(null);




  return (

    
    <>

    {viewMode === "month" ? (
    <>
    
      <div className={`trading-calendar ${isDarkMode ? '' : 'light-mode'}`}>

        {/* Theme toggle */}
        <div className="theme-toggle-container">
          {/* <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            <span className="theme-icon">{isDarkMode ? '🌙' : '☀️'}</span>
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="theme-icon">{isDarkMode ? '☀️' : '🌙'}</span>
          </button> */}

          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>

          </button>

        </div>

        {/* STATS GRID */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              Net P&L <span className="stat-badge">{tradingDays}</span>
            </div>
            <div className={`stat-value ${totalPnL >= 0 ? 'green' : 'red'}`}>
              {totalPnL < 0 ? '-' : ''}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Trade win %</div>
            <div className="stat-value">{winRate}%</div>

            <svg className="gauge" viewBox="0 0 80 50">
              <path className="gauge-bg" d="M 10 45 A 35 35 0 0 1 70 45" fill="none" strokeWidth="8" strokeLinecap="round"/>
              <path d="M 10 45 A 35 35 0 0 1 70 45"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${winRate * 1.1} 110`}
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%">
                  <stop offset="0%" stopColor="#ef4444"/>
                  <stop offset="50%" stopColor="#eab308"/>
                  <stop offset="100%" stopColor="#10b981"/>
                </linearGradient>
              </defs>
            </svg>

            <div className="indicators">
              <span className="indicator green">{wins}</span>
              <span className="indicator gray">{breakeven}</span>
              <span className="indicator red">{losses}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Profit factor</div>
            <div className="stat-value">{profitFactor}</div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="nav">
          <div className="nav-left">

            <button
              className="nav-btn"
              onClick={() => {
                const newDate = new Date(year, month - 1, 1);
                setCurrentDate(newDate);

                // clear selected day data when changing month
                setSelectedDayData(null);

                // notify parent to clear
                onDayClick(null);
              }}
            >
              ‹
            </button>


            <span className="month-title">
              {monthNames[month]} {year}
            </span>

           <button
            className="nav-btn"
            onClick={() => {
              const newDate = new Date(year, month + 1, 1);
              setCurrentDate(newDate);

              setSelectedDayData(null);
              onDayClick(null);
            }}
          >
            ›
          </button>


            <button
              className="this-month-btn"
              onClick={() => {
                const newDate = new Date();
                setCurrentDate(newDate);

                setSelectedDayData(null);
                onDayClick(null);
              }}
            >
              This month
            </button>

          </div>


           <div className="nav-left">
            <button className="nav-btn" onClick={() => setViewMode("year") && setCurrentDate(new Date(year - 1, 0, 1))}>‹</button>
            <span className="month-title" onClick={() => setViewMode("year")}>{year}</span>
            <button className="nav-btn" onClick={() => setViewMode("year") && setCurrentDate(new Date(year + 1, 0, 1))}>›</button>
            <button className="this-month-btn" onClick={() => { setViewMode("year"); setCurrentDate(new Date()); }}>This year</button>

          </div>

          <div className="monthly-stats">
            <span className="monthly-stats-label">Monthly stats:</span>
            <span className={`badge ${totalPnL >= 0 ? 'green' : 'red'}`}>
              {totalPnL < 0 ? '-' : ''}{formatLargePnL(Math.abs(totalPnL))}
            </span>
            <span className="badge gray">{tradingDays} days</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="calendar-container">
          <div className="calendar">
            <div className="week-header">
              {dayNames.map(d => <div key={d} className="day-header">{d}</div>)}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="week-row">
                {week.map((day, di) => {
                  const data = monthData[day];
                  return (
                    <div
                      key={di}
                      className={getCellClass(day)}
                    


                    >
                      {day && <div className="day-number">{day}</div>}
                      {data && (
                        <>
                          <div className={getPnLClass(data)}>
                            {formatDisplayPnL(data.pnl)}
                          </div>
                          <div className="trade-info">{data.trades} trades</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Weekly stats */}
          <div className="weekly-sidebar">
            {weeklyStats.map((w, i) => (
              <div key={i} className="week-card">
                <div className="week-label">Week {i + 1}</div>
                <div className={`week-pnl ${w.pnl >= 0 ? 'green' : 'red'}`}>
                  {w.pnl >= 0 ? '+' : ''}{formatLargePnL(w.pnl)}
                </div>
                <div className="week-days">{w.days} days</div>
              </div>
            ))}
          </div>
        </div>

        <br/><br/>

       <TradeDetails
          date={currentDate}
          monthStats={stats}
          theme={theme}
      />


       


      </div>

      
      </>
    ) : (
     <YearView
    date={currentDate}
    setDate={setCurrentDate}
    setViewMode={setViewMode}
    calendarData={MOCK_CALENDAR_DATA}
/>

    )}



    </>
  );
}

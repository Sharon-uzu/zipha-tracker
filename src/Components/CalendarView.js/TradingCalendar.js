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

export default function TradingCalendar({ onDayClick, setAppDate, appDate, openTradeForm }) {
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

const getGaugeColor = (percentage) => {
  if (percentage <= 40) {
    const ratio = percentage / 40;
    return `rgb(${239 - (239 - 234) * ratio}, ${68 + (179 - 68) * ratio}, 68)`;
  }

  if (percentage <= 70) {
    const ratio = (percentage - 40) / 30;
    return `rgb(${234 - (234 - 16) * ratio}, ${179 + (185 - 179) * ratio}, ${8 + (129 - 8) * ratio})`;
  }

  const ratio = (percentage - 70) / 30;
  return `rgb(${16 - (16 - 10) * ratio}, ${185}, ${129 + (129 - 81) * ratio})`;
};

  
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

const total = wins + breakeven + losses;

const greenPercent = (wins / total) * 100;
const grayPercent = (breakeven / total) * 100;
const redPercent = (losses / total) * 100;



const [selectedDayData, setSelectedDayData] = useState(null);




  return (

    
    <>

    {viewMode === "month" ? (
    <>
    
      <div className={`trading-calendar ${isDarkMode ? '' : 'light-mode'}`}>

        {/* Theme toggle 
        <div className="theme-toggle-container">
       

          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>

          </button>

        </div>*/}

        {/* STATS GRID */}
        <div className="stats-grid">
          <div className="stat-card stat-card-flex">
            <div>
              <div className="stat-label">
                Net P&L <span className="stat-badge">{tradingDays}</span>
              </div>
              <div className={`stat-value ${totalPnL >= 0 ? 'green' : 'red'}`}>
                {totalPnL < 0 ? '-' : ''}${Math.round(Math.abs(totalPnL)).toLocaleString()}
              </div>
            </div>

            <div>
              <div className="stat-label">ROI (%)</div>

                <div className={`stat-value ${stats.roiPercent >= 0 ? 'green' : 'red'}`}>
                  {stats.roiPercent}%
                </div>

                </div>

          </div>

          <div className="stat-card stat-card-flex">
            <div>
              <div className="stat-label">Trade win %</div>
              <div className="stat-value">{winRate}%</div>
            </div>

            <div className='gauge-div'>

              <svg className="gauge" viewBox="5 20 70 50">

                <defs>
                  <linearGradient id="gaugeGrad" gradientUnits="userSpaceOnUse">
                    
                    {/* GREEN segment */}
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset={`${greenPercent}%`} stopColor="#10b981" />

                    {/* GRAY segment */}
                    <stop offset={`${greenPercent}%`} stopColor="#4F46E5" />
                    <stop offset={`${greenPercent + grayPercent}%`} stopColor="#4F46E5" />

                    {/* RED segment */}
                    <stop offset={`${greenPercent + grayPercent}%`} stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#ef4444" />

                  </linearGradient>
                </defs>

                <path
                  className="gauge-bg"
                  d="M 10 45 A 35 35 0 0 1 70 45"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                <path
                  d="M 10 45 A 35 35 0 0 1 70 45"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="110 110"
                />
              </svg>



              <div className="indicators">
                <span className="indicator green">{wins}</span>
                <span className="indicator gray">{breakeven}</span>
                <span className="indicator red">{losses}</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Profit factor</div>
            <div className="stat-value">{profitFactor}</div>
          </div>

          <div className="theme-toggle-container">
       

          <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>

          </button>

        </div>



        </div>


        <div className='nav-calendar'>

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
                          {/* WIN RATE PERCENT */}
                          <div className="day-percentage">
                            {data.winRate}
                          </div>
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
              {weeklyStats.slice(0, 5).map((w, i) => (
                <div key={i} className="week-card">
                  <div className="week-label">Week {i + 1}</div>
                    <p style={{fontSize:'12px'}} className={`week-roi ${w.roiPercent >= 0 ? 'green' : 'red'}`}>
                      {w.roiPercent}%
                    </p>
                  <div className={`week-pnl ${w.pnl >= 0 ? 'green' : 'red'}`}>
                    {w.pnl >= 0 ? '+' : ''}{formatLargePnL(w.pnl)}
                  </div>


                  <div className="week-days">{w.days} days</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <br/><br/>

       {/* <TradeDetails
          date={currentDate}
          monthStats={stats}
          theme={theme}
      /> */}

      <TradeDetails 
      date={currentDate}
      monthStats={stats}
      theme={theme}
      onAddTrade={openTradeForm}
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

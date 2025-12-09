import { useState, useMemo, useEffect } from 'react';
import { BsFileEarmarkBarGraph } from "react-icons/bs";
import { TrendingUp, Trash2 } from "lucide-react";
import RecentTradesDashboard from './RecentTradesDashboard';
import {
  getMonthData,
  getMonthStats,
  formatLargePnL,
  MOCK_CALENDAR_DATA,
  populateCalendarData
} from '../data/mockCalendarData';
import YearView from './YearView';

import TradeDetails from './TradeDetails';
import AnalyticsDashboard from './AnalyticsDashboard';
import { MdKeyboardArrowDown } from "react-icons/md";
import { supabase } from "../../supabase";


const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const getTotalStats = () => {
    let totalPnL = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalBreakeven = 0;
    let totalTradingDays = 0;

    for (const dateStr in MOCK_CALENDAR_DATA) {
        const dayData = MOCK_CALENDAR_DATA[dateStr];
        const pnlValue = Number(dayData.pnl || 0); // Assuming pnl is stored as string/number in MOCK_CALENDAR_DATA
        
        totalPnL += pnlValue;
        totalTradingDays++;
        
        if (pnlValue > 0) totalWins++;
        else if (pnlValue < 0) totalLosses++;
        else totalBreakeven++;
    }

    const totalTrades = totalWins + totalLosses + totalBreakeven;
    const totalWinRate = totalTrades > 0 ? ((totalWins / (totalWins + totalLosses || 1)) * 100).toFixed(2) : "0.00";
    const totalProfitFactor = totalLosses > 0 ? (Math.abs(totalPnL) / (totalLosses * -1)).toFixed(2) : totalWins > 0 ? "∞" : "0.00";
    
    // Recalculating P&L factor for profit factor: 
    // Sum of positive PnL / Sum of absolute negative PnL
    let sumWinnings = 0;
    let sumLosses = 0;
    for (const dateStr in MOCK_CALENDAR_DATA) {
        const pnlValue = Number(MOCK_CALENDAR_DATA[dateStr].pnl || 0);
        if (pnlValue > 0) sumWinnings += pnlValue;
        else if (pnlValue < 0) sumLosses += Math.abs(pnlValue);
    }
    const betterProfitFactor = sumLosses > 0 ? (sumWinnings / sumLosses).toFixed(2) : sumWinnings > 0 ? "∞" : "0.00";

    return {
        totalPnL,
        totalWins,
        totalLosses,
        totalBreakeven,
        totalTradingDays,
        totalWinRate,
        totalProfitFactor: betterProfitFactor, 
    };
};





const SwitchAccountModal = ({ accounts, onClose, onSwitch, onCreateNew }) => {

  
    return (
        <div className="account-modal-overlay" onClick={onClose}>
            <div className="account-modal-content" onClick={e => e.stopPropagation()}>
                <div className="account-modal-header">
                    <h2>Switch Account</h2>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="account-list">
                    {accounts.map(account => (
                        <div 
                      key={account.id} 
                      className={`account-item ${account.active ? 'active' : ''}`}
                      onClick={() => onSwitch(account.id)}
                    >
                      <div className='account-item-details'>
                        <div className="account-name-row">
                          <span className="account-name">{account.account_name}</span>
                          {account.active && (
                            <MdKeyboardArrowDown 
                              size={20} 
                              style={{ transform: 'rotate(-90deg)' }}
                            />
                          )}
                        </div>

                        <div className="account-info">
                          {/* Capital (safe) */}
                          <span className="account-value">
                            ${Number(account.capital ?? 0).toLocaleString()}
                          </span>

                          {/* Started with */}
                          <span className="started-with">
                            Started with ${Number(account.capital ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* ROI (not available → show 0%) */}
                      <div className={`account-roi ${0 >= 0 ? 'green' : 'red'}`}>
                        0.0%
                      </div>

                      {/* Delete button (optional) */}
                      <button 
                        className="delete-btn" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          console.log(`Delete account ${account.account_name}`); 
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    ))}
                </div>
                <div className="create-new-row" onClick={onCreateNew}>
                    <button className="create-new-btn">
                        + Create New Account
                    </button>
                </div>
            </div>
        </div>
    );
};









const CreateAccountModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [capital, setCapital] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("zipha_user"));
    if (!user || !user.id) {
      alert("You are not logged in.");
      return;
    }

    const { data, error } = await supabase
      .from("zipha-accounts")
      .insert([
        {
          user_id: user.id,
          account_name: name,
          capital: Number(capital)
        }
      ])
      .select()
      .single();

    if (error) {
      alert("Error creating account: " + error.message);
      return;
    }

    onCreated(data);   // update parent state
    onClose();         // close modal
  };

  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <h2>Create New Account</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
         

          <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Account Name
              </label>
              <input
               type="text"
                value={name}
                placeholder="My Trading Account"
                onChange={(e) => setName(e.target.value)}
                required
                
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

          <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#ccc',
                marginBottom: '8px'
              }}>
                Starting Capital
              </label>
              <input
                type="number"
                value={capital}
                placeholder="5000"
                onChange={(e) => setCapital(e.target.value)}
                required
                
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

          

          <button type="submit" className="create-new-btn" style={{ marginTop: "20px" }}>
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};


export default function TradingCalendar({ onDayClick, setAppDate, appDate, openTradeForm, onLogout, onAnalyticsClick, currentView, onAddTrade }) {
  
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [accountName, setAccountName] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  

  useEffect(() => {
  const loadAccounts = async () => {
    const user = JSON.parse(localStorage.getItem("zipha_user"));
    if (!user || !user.id) return;

    const { data, error } = await supabase
      .from("zipha-accounts")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data?.length > 0) {
      setAccounts(data);

      // first account
      setActiveAccount(data[0]);
      setAccountName(data[0].account_name);

      // update the capital displayed to the user's real account
      setUserCapital(data[0].capital);
    }
  };

  loadAccounts();
}, []);


  const [isAccountModalOpen, setIsAccountModalOpen] = useState(true); // Add this

  const [dataLoaded, setDataLoaded] = useState(false);

useEffect(() => {
  let mounted = true;
  const loadData = async () => {
    if (!mounted) return;
    await populateCalendarData();
    setDataLoaded(true); // trigger re-render
  };
  loadData();
  return () => { mounted = false; };
}, []);



const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();


  // State for user's capital, fetched from localStorage
  const [userCapital, setUserCapital] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("zipha_user"));
    if (user && user.capital) {
      // Ensure capital is stored as a number
      setUserCapital(parseFloat(user.capital)); 
    }
  }, []);

  // Load month data
  const monthData = useMemo(() => getMonthData(year, month), [year, month, dataLoaded]);
  
  // STATS: Pass userCapital to getMonthStats for accurate ROI calculation
  const stats = useMemo(() => getMonthStats(year, month, userCapital), [year, month, dataLoaded, userCapital]);

  const monthStats = useMemo(() => getMonthStats(year, month, userCapital), [year, month, dataLoaded, userCapital]);
  const { totalPnL, wins, losses, breakeven, tradingDays, winRate, profitFactor, weeklyStats } = monthStats; // monthly stats still needed for calendar UI

   // CUMULATIVE STATS (Used for main dashboard cards)
    const cumulativeStats = useMemo(() => getTotalStats(), [dataLoaded]);
    const { 
        totalPnL: overallNetPnL, 
        totalWins, 
        totalLosses, 
        totalBreakeven, 
        totalWinRate, 
        totalProfitFactor,
        totalTradingDays 
    } = cumulativeStats;

    const getTotalCumulativePnL = () => {
        let cumulativePnL = 0;
        
        // Iterate through all years/months/days in MOCK_CALENDAR_DATA
        for (const yearKey in MOCK_CALENDAR_DATA) {
            const yearData = MOCK_CALENDAR_DATA[yearKey];
            for (const monthKey in yearData) {
                const monthData = yearData[monthKey];
                for (const dayKey in monthData) {
                    const dayData = monthData[dayKey];
                    // Assuming 'pnlValue' holds the numeric P&L for the day
                    cumulativePnL += dayData.pnlValue || 0; 
                }
            }
        }
        return cumulativePnL;
    };

  
    const realBalance = userCapital + overallNetPnL;


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
  if (pnl === 0 || pnl === "0") return '$0';
  return pnl < 0 ? `-$${Math.abs(pnl)}` : `$${pnl}`;
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

// Use cumulative stats for the gauge calculation
const totalTradesCumulative = totalWins + totalBreakeven + totalLosses;
const greenPercent = (totalWins / totalTradesCumulative) * 100;
const grayPercent = (totalBreakeven / totalTradesCumulative) * 100;
const redPercent = (totalLosses / totalTradesCumulative) * 100;


const handleSwitchAccount = async (id) => {
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;

  // Update active account in state & localStorage
  setActiveAccount(acc);
  setUserCapital(acc.capital);
  localStorage.setItem("active_account", JSON.stringify(acc));

  // Close modal
  setIsAccountModalOpen(false);

  // Reload trades for the selected account
  await populateCalendarData();

  //  window.location.reload();


  console.log(`Switched to account: ${acc.account_name}`, acc);
};


const handleCreateNewAccount = () => {
  setIsAccountModalOpen(false);
  setIsCreateModalOpen(true);
};




const [selectedDayData, setSelectedDayData] = useState(null);

const [selectedTrade, setSelectedTrade] = useState(null);

const handleViewDetails = (trade) => {
        setSelectedTrade(trade);
    };


    // Calculate the total/cumulative ROI
    const totalRoiPercent = userCapital > 0 
        ? ((overallNetPnL / userCapital) * 100).toFixed(2)
        : "0.00";
      


if (currentView === "analytics") {
        return (
            <AnalyticsDashboard
                onBack={onAnalyticsClick} 
                theme={theme}
            />
        );
    }



  return (

    
    <>

      
    {isAccountModalOpen && (
        <SwitchAccountModal 
            accounts={accounts} 
            onClose={() => setIsAccountModalOpen(false)}
            onSwitch={handleSwitchAccount}
            onCreateNew={handleCreateNewAccount}
        />
    )}


    {isCreateModalOpen && (
    <CreateAccountModal
      onClose={() => setIsCreateModalOpen(false)}
      onCreated={(newAccount) => {
        setAccounts((prev) => [...prev, newAccount]);
        setActiveAccount(newAccount);
        setUserCapital(newAccount.capital);
      }}
    />
  )}

    

    {viewMode === "month" ? (
    <>
    
      <div className={`trading-calendar ${isDarkMode ? '' : 'light-mode'}`}>

        {/* STATS GRID */}
        <div className="stats-grid">

          <div className="stat-card stat-card-flex" style={{alignItems:'start'}}>

            <div>
              <div className="stat-label">
                Capital 
              
              </div>
              <div className='stat-value'>
                ${userCapital.toLocaleString()}
              </div>

              {activeAccount && (
                <div style={{ marginTop: "4px", fontSize: "13px", opacity: 0.8, textAlign:'start' }}>
                  {activeAccount.account_name}
                </div>
              )}

            </div>

               <div>
             
              <div
                className="stat-value arrow-icon"
                style={{ cursor: "pointer" }}
                onClick={() => setIsAccountModalOpen(true)}
              >
                <MdKeyboardArrowDown />
              </div>

            </div>



          </div>

          <div className="stat-card">
              <div className="stat-label">
                Balance 
              
            </div>
            <div className='stat-value'>
              ${realBalance.toLocaleString()}
            </div>



          </div>

          <div className="stat-card">
             <div className="stat-label">
               Net P&L (Cumulative) <span className="stat-badge">{totalTradingDays}</span>
               </div>
               <div className={`stat-value ${overallNetPnL >= 0 ? 'green' : 'red'}`}>
                  {overallNetPnL < 0 ? '-' : ''}${Math.round(Math.abs(overallNetPnL)).toLocaleString()}               
                </div>

            
          </div>


          
           <div className="theme-toggle-container" style={{alignItems:'center', display:'flex'}}>
          

            <button className="theme-toggle" onClick={toggleTheme}>
              <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>
              <div className="toggle-track"><div className="toggle-thumb" /></div>
              <span className="theme-icon">{theme === "dark" ?  '🌙'  : '☀️'}</span>

            </button>

            <button 
                className="this-month-btn"
                style={{ marginLeft: "10px", background: "none", color: "#ccc" }}
                onClick={() => {
                  localStorage.removeItem("zipha_user_id");
                  console.log("Logged out! LocalStorage cleared.");
                  window.location.reload();
                }}
              >
                Logout
              </button>


          </div>




          <div className="stat-card">

            <div>
              <div className="stat-label">ROI (%)</div>
              <div className={`stat-value ${monthStats.roiPercent >= 0 ? 'green' : 'red'}`}>
                 {totalRoiPercent}%
               </div>

            </div>

          </div>

          


          <div className="stat-card stat-card-flex">
            <div>
              <div className="stat-label">Trade win %</div>
              <div className="stat-value">{totalWinRate}%</div>
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
                <span className="indicator green">{totalWins}</span>
                 <span className="indicator gray">{totalBreakeven}</span>
                 <span className="indicator red">{totalLosses}</span>
               </div>
            </div>
          </div>

          <div className="stat-card">

            <div>
              <div className="stat-label">Profit factor</div>
              <div className="stat-value">{totalProfitFactor}</div>

            </div>

          </div>

          <div className="stat-card">


            <div style={{ cursor: 'pointer' }} onClick={onAnalyticsClick}> 
              <div className="stat-label">Analytics</div>
              <div className="stat-value"><BsFileEarmarkBarGraph /></div>
            </div>

          </div>

         
                


        </div><br/>

        

          <RecentTradesDashboard 
              onTradeView={handleViewDetails}
              theme={theme}
          />

            {/* Actions */}
            <div className="panel-actions" style={{width:'95%', margin:'auto', display:'flex', justifyContent:'end', marginBottom:'20px'}}>
      
              <button className="btn btn-primary" onClick={onAddTrade}>
                <TrendingUp className="icon-sm icon-mr" />
                Add Trade
              </button>
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
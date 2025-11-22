import React from "react";
import {
  getDaysInMonth,
  getStartDayOfMonth,
  formatDate,
  WEEK_DAYS,
} from "./helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import YearlyPnlChart from "./YearlyPnlChart";
import { parsePnL } from "../data/mockCalendarData";

export default function YearView({
  date,
  setDate,
  setViewMode,
  // getMonthlyStats and getYearStats are not strictly used in this logic, but kept for context
  getMonthlyStats, 
  getYearStats,
  calendarData, // MUST contain all trading data keys
}) {
  const year = date.getFullYear();

  
  const dataYears = Object.keys(calendarData)
    .map(dateStr => new Date(dateStr).getFullYear())
    .filter((y, index, self) => self.indexOf(y) === index); // Get unique years

  // Get the minimum year from the available data. Defaults to the current year if no data.
  const minYear = dataYears.length > 0 ? Math.min(...dataYears) : year;
 
  // Generate all days in the visible calendar for a month
  const generateMonthDays = (month) => {
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getStartDayOfMonth(year, month);

    const days = [];
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevDaysCount = getDaysInMonth(prevYear, prevMonth);

    // Days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(prevYear, prevMonth, prevDaysCount - i),
        isCurrentMonth: false,
      });
    }

    // Days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Days from next month
    let nextDay = 1;
    while (days.length < 42) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        date: new Date(nextYear, nextMonth, nextDay++),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Calculate monthly PnL + trades
 const getMonthlyTotals = (month) => {
  const monthDays = generateMonthDays(month);
  let pnl = 0;
  let trades = 0;

  for (const day of monthDays) {
    const key = formatDate(day.date);

    const data =
      day.isCurrentMonth && calendarData[key]
        ? calendarData[key]
        : null;

    if (data) {
      pnl += parsePnL(data.pnl); // ← FIXED
      trades += data.trades || 0;
    }
  }

  return { pnl, trades };
};


  // Year: array of { pnl, trades } for the chart and quarters
  const yearlyData = Array.from({ length: 12 }, (_, m) =>
    getMonthlyTotals(m)
  );

  // For chart: only pnl
  const yearlyPnls = yearlyData.map((m) => m.pnl);

  // --- NAVIGATION HANDLERS ---
const goToPreviousYear = () => {
  // Prevent going before the earliest data year
  if (year > minYear) {
    setViewMode("year");
    setDate(prev => new Date(prev.getFullYear() - 1, 0, 1));
  }
};

const goToNextYear = () => {
  // Allow going ANYWHERE forward
  setViewMode("year");
  setDate(prev => new Date(prev.getFullYear() + 1, 0, 1));
};

  
  const goToThisYear = () => {
    setViewMode("year");
    setDate(new Date(new Date().getFullYear(), 0, 1));
  };
  
  const goToPreviousMonth = () => {
    setViewMode("month");
    setDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const quarters = [
    { label: "Q1", months: [0, 1, 2] },
    { label: "Q2", months: [3, 4, 5] },
    { label: "Q3", months: [6, 7, 8] },
    { label: "Q4", months: [9, 10, 11] },
  ];

  return (
    <div className="year-view-wrapper">
      {/* Navigation */}
      <div className="month-navigation-bar">
        <div className="month-nav-group">
          <button className="nav-button" onClick={goToPreviousMonth}>
            <ChevronLeft className="text-indigo" />
          </button>

          <button className="btn-this-month" onClick={() => setViewMode("month")}>Back to Month</button>


          {/* Backward Arrow: Disabled at minYear */}
          <button className="nav-button" onClick={goToPreviousYear} disabled={year <= minYear}>
          <ChevronLeft className={`text-indigo ${year <= minYear ? "text-gray" : ""}`} />
          </button>


          <span className="current-month-year">{year}</span>

          {/* Forward Arrow: Unrestricted */}
          <button 
            className="nav-button" 
            onClick={goToNextYear}
          >
            <ChevronRight className="text-indigo" />
          </button>

          <button className="btn-this-month" onClick={goToThisYear}>
            This Year
          </button>


        </div>
      </div>

      {/* QUARTERS */}
      {quarters.map((q) => {
        const quarterTotals = q.months.reduce(
          (acc, m) => {
            const t = getMonthlyTotals(m);
            acc.pnl += t.pnl;
            acc.trades += t.trades;
            return acc;
          },
          { pnl: 0, trades: 0 }
        );

        return (
          <div key={q.label} className="quarter-section">
            <h2 className="quarter-title">
              {/* {q.label} {year} */}
            </h2>

            <div className="quarter-row">
              {q.months.map((month) => {
                const totals = getMonthlyTotals(month);
                const pnl = totals.pnl;
                const trades = totals.trades;

                const monthDays = generateMonthDays(month);
                const monthName = new Date(year, month, 1).toLocaleString(
                  "en-US",
                  { month: "long" }
                );

                return (
                  <div key={month} className="month-card">
                    <h4 className="month-name">{monthName}</h4>

                    <div className="weekday-row">
                      {WEEK_DAYS.map((day) => (
                        <div key={day}>{day.slice(0, 2)}</div>
                      ))}
                    </div>

                    <div className="days-grid">
                      {monthDays.map((d, idx) => {
                        const key = formatDate(d.date);
                        const data =
                          d.isCurrentMonth && calendarData[key]
                            ? calendarData[key]
                            : null;

                        return (
                          <div
                            key={idx}
                            className={`day-tile ${
                              !d.isCurrentMonth ? "inactive" : ""
                            }`}
                          >
                            <div
                              className={`date-circle ${
                                data
                                  ? data.isLoss
                                    ? "loss"
                                    : "profit"
                                  : ""
                              }`}
                            >
                              {d.date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* MONTH SUMMARY */}
                    <div
                      className={`month-pnl ${
                        pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      ${pnl.toFixed(0)}
                    </div>
                    
                  </div>
                );
              })}

              {/* QUARTER SUMMARY */}
              <div className="quarter-summary">
                <h4>{q.label} Summary</h4>
                <p
                  className={
                    quarterTotals.pnl >= 0 ? "text-profit" : "text-loss"
                  }
                >
                  Total PnL: ${quarterTotals.pnl.toFixed(0)}
                </p>
                <p className="quarter-trades">
                  Trades: {quarterTotals.trades}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* YEARLY CHART */}    
      <YearlyPnlChart yearlyPnls={yearlyPnls} year={year}/>
    </div>
  );
}
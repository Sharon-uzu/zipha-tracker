// This file simulates complex financial calculations based on daily trade data.

// Convert string PnL (like '96.8K' or '-4.07K') to a float value
const parsePnl = (pnlString) => {
    if (!pnlString) return 0;
    // Safely clean string before parsing
    let value = parseFloat(String(pnlString).replace('$', '').replace(/,/g, ''));
    if (String(pnlString).includes('K')) {
        value *= 1000;
    }
    return value;
};

// Simplified trade data for aggregation (must be provided from calendar's daily data)
const dailyTradeData = {
    '2025-04-02': { pnl: '96.8K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-04-03': { pnl: '0', trades: 5, type: 'zero' },
  '2025-04-07': { pnl: '0', trades: 4, type: 'zero' },
  '2025-04-08': { pnl: '-4.07K', trades: 1, type: 'negative' },
  '2025-04-14': { pnl: '8.25K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-04-15': { pnl: '9.85K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-04-16': { pnl: '0', trades: 1, type: 'zero' },
  '2025-04-17': { pnl: '7.71K', trades: 3, winRate: '100.0%', type: 'positive' },
  '2025-04-21': { pnl: '0', trades: 1, type: 'zero' },
  '2025-04-22': { pnl: '0', trades: 1, type: 'zero' },
  '2025-04-25': { pnl: '30.9K', trades: 7, winRate: '100.0%', type: 'positive' },
  '2025-04-28': { pnl: '148K', trades: 10, winRate: '100.0%', type: 'positive' },
  '2025-04-29': { pnl: '-1.94K', trades: 1, winRate: '0.0%', type: 'negative' },
  '2025-04-30': { pnl: '32.7', trades: 1, winRate: '100.0%', type: 'positive' },

  '2025-05-02': { pnl: '96.8K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-05-03': { pnl: '0', trades: 5, type: 'zero' },
  '2025-05-07': { pnl: '0', trades: 4, type: 'zero' },
  '2025-06-08': { pnl: '-4.07K', trades: 1, type: 'negative' },
  '2025-06-14': { pnl: '8.25K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-06-15': { pnl: '9.85K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-07-6': { pnl: '0', trades: 1, type: 'zero' },
  '2025-07-8': { pnl: '7.71K', trades: 3, winRate: '100.0%', type: 'positive' },
  '2025-07-12': { pnl: '0', trades: 1, type: 'zero' },
  '2025-07-15': { pnl: '0', trades: 1, type: 'zero' },
  '2025-08-5': { pnl: '30.9K', trades: 7, winRate: '100.0%', type: 'positive' },
  '2025-08-8': { pnl: '148K', trades: 10, winRate: '100.0%', type: 'positive' },
  '2025-08-19': { pnl: '-1.94K', trades: 1, winRate: '0.0%', type: 'negative' },
  '2025-08-20': { pnl: '32.7', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-09-02': { pnl: '96.8K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-09-03': { pnl: '0', trades: 5, type: 'zero' },
  '2025-09-07': { pnl: '0', trades: 4, type: 'zero' },
  '2025-09-08': { pnl: '-4.07K', trades: 1, type: 'negative' },
  '2025-09-14': { pnl: '8.25K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-09-15': { pnl: '9.85K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-10-02': { pnl: '96.8K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-10-05': { pnl: '0', trades: 5, type: 'zero' },
  '2025-10-07': { pnl: '0', trades: 4, type: 'zero' },
  '2025-10-08': { pnl: '-4.07K', trades: 1, type: 'negative' },
  '2025-10-12': { pnl: '8.25K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-10-13': { pnl: '9.85K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-11-02': { pnl: '96.8K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-11-05': { pnl: '0', trades: 5, type: 'zero' },
  '2025-11-07': { pnl: '0', trades: 4, type: 'zero' },
  '2025-11-10': { pnl: '-4.07K', trades: 1, type: 'negative' },
  '2025-11-14': { pnl: '8.25K', trades: 1, winRate: '100.0%', type: 'positive' },
  '2025-11-15': { pnl: '9.85K', trades: 1, winRate: '100.0%', type: 'positive' },
  
};

/**
 * Calculates all summary stats for a given month based on daily trade data.
 * @param {Date} date - The current date selected in the calendar (determines the month).
 * @param {Object} allDailyData - The full object of daily trade statistics.
 * @returns {Object} { headerData, weeklyData, calendarData }
 */
export const getMonthlyStats = (date, allDailyData) => {
    // 1. Filter data to include only the selected month
    const yearMonth = date.toISOString().slice(0, 7); // e.g., '2025-04'
    const daysInMonth = Object.entries(allDailyData).filter(([key]) => key.startsWith(yearMonth));

    // Fallback for months with no data
    if (daysInMonth.length === 0) {
        return {
            headerData: { netPnl: '$0.00', tradeWinPercent: '0.00%', profitFactor: '0.00', totalDays: 0 },
            weeklyData: [{ week: 'No Data', pnl: '0.00', days: 0, type: 'zero' }],
        };
    }

    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0; // Initialize safely
    let totalPositivePnl = 0;
    let totalNegativePnl = 0;
    const tradingDays = new Set();
    const weeklyBreakdown = {};

    daysInMonth.forEach(([dateString, data]) => {
        const pnl = parsePnl(data.pnl);
        const dayDate = new Date(dateString);
        
        // **⭐️ CORE FIX: Calculate Daily Wins Safely ⭐️**
        let dailyWins = 0;
        if (data.trades > 0 && data.winRate) {
            // Remove '%' and parse the rate
            const winRateValue = parseFloat(String(data.winRate).replace('%', ''));
            // Calculate wins for the day: trades * (winRate / 100)
            dailyWins = Math.round(data.trades * (winRateValue / 100));
        }

        // --- Aggregation for Header ---
        totalPnl += pnl;
        totalTrades += data.trades;
        totalWins += dailyWins; // Use the calculated dailyWins

        if (pnl > 0) totalPositivePnl += pnl;
        if (pnl < 0) totalNegativePnl += Math.abs(pnl);
        if (data.trades > 0) tradingDays.add(dateString);

        // --- Aggregation for Weekly Stats ---
        const weekNum = Math.ceil((dayDate.getDate() + dayDate.getDay()) / 7); 
        const weekKey = `Week ${weekNum}`;

        weeklyBreakdown[weekKey] = weeklyBreakdown[weekKey] || { pnl: 0, days: 0, pnlStr: '' };
        weeklyBreakdown[weekKey].pnl += pnl;
        weeklyBreakdown[weekKey].days += (data.trades > 0) ? 1 : 0;
    });

    // --- Final Header Calculations ---
    const netPnlFormatted = totalPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    
    // Calculate final win rate as a number
    const winRateNumber = totalTrades > 0 ? ((totalWins / totalTrades) * 100) : 0;
    // Format for display string
    const tradeWinPercent = winRateNumber.toFixed(2) + '%';
    
    const profitFactor = totalNegativePnl > 0 ? (totalPositivePnl / totalNegativePnl).toFixed(2) : totalPositivePnl > 0 ? 'INF' : '0.00';
    
    // --- Final Weekly Stats Formatting ---
    const weeklyData = Object.entries(weeklyBreakdown).map(([week, stats]) => ({
        week: week,
        pnl: (stats.pnl / 1000).toFixed(2) + 'K',
        days: stats.days,
        type: stats.pnl > 0 ? 'positive' : stats.pnl < 0 ? 'negative' : 'zero',
    }));

    return {
        headerData: {
            netPnl: netPnlFormatted,
            tradeWinPercent: tradeWinPercent,
            profitFactor: profitFactor,
            totalDays: tradingDays.size,
        },
        weeklyData: weeklyData,
        calendarData: allDailyData,
    };
};

export const tradeData = dailyTradeData;
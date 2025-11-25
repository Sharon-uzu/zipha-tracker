// data/tradingData.js

export const MOCK_CALENDAR_DATA = {
  "2025-04-03": { pnl: "96.8K", trades: 2, winRate: "90.0%", isLoss: false },
  "2025-04-04": { pnl: "0", trades: 5, winRate: "0.0%", isLoss: false },
  "2025-04-07": { pnl: "0", trades: 4, winRate: "0.0%", isLoss: false },
  "2025-04-09": { pnl: "-4.07K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-04-14": { pnl: "8.25K", trades: 1, winRate: "80.0%", isLoss: false },
  "2025-04-15": { pnl: "9.85K", trades: 1, winRate: "80.0%", isLoss: false },
  "2025-04-16": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-04-17": { pnl: "7.71K", trades: 3, winRate: "90.0%", isLoss: false },
  "2025-04-21": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-04-22": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-04-25": { pnl: "30.9K", trades: 7, winRate: "100.0%", isLoss: false },
  "2025-04-28": { pnl: "108K", trades: 10, winRate: "100.0%", isLoss: false },
  "2025-04-29": { pnl: "-1.94K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-04-30": { pnl: "32.7", trades: 1, winRate: "100.0%", isLoss: false },
  "2025-05-04": { pnl: "0", trades: 5, winRate: "0.0%", isLoss: false },
  "2025-05-07": { pnl: "0", trades: 4, winRate: "0.0%", isLoss: false },
  "2025-05-09": { pnl: "-4.07K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-06-14": { pnl: "8.25K", trades: 1, winRate: "100.0%", isLoss: false },
  "2025-06-15": { pnl: "9.85K", trades: 1, winRate: "100.0%", isLoss: false },
  "2025-06-16": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-06-17": { pnl: "7.71K", trades: 3, winRate: "100.0%", isLoss: false },
  "2025-07-01": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-07-02": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2025-08-05": { pnl: "30.9K", trades: 7, winRate: "100.0%", isLoss: false },
  "2025-09-08": { pnl: "148K", trades: 10, winRate: "100.0%", isLoss: false },
  "2025-09-09": { pnl: "-1.94K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-11-03": { pnl: "96.8K", trades: 2, winRate: "90.0%", isLoss: false },
  "2025-11-04": { pnl: "0", trades: 5, winRate: "0.0%", isLoss: false },
  "2025-11-07": { pnl: "0", trades: 4, winRate: "0.0%", isLoss: false },
  "2025-11-10": { pnl: "-15.07K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-11-19": { pnl: "9.85K", trades: 1, winRate: "80.0%", isLoss: false },
  "2025-11-24": { pnl: "-15.07K", trades: 1, winRate: "0.0%", isLoss: true },
  "2025-11-25": { pnl: "9.85K", trades: 1, winRate: "80.0%", isLoss: false },
  "2025-11-27": { pnl: "0", trades: 1, winRate: "0.0%", isLoss: false },
  "2026-01-01": { pnl: "32.7", trades: 1, winRate: "100.0%", isLoss: false },
  "2026-01-03": { pnl: "0", trades: 5, winRate: "0.0%", isLoss: false },

};

// Helper function to parse P&L string to number
export const parsePnL = (pnlStr) => {
  if (!pnlStr || pnlStr === "0") return 0;
  const num = parseFloat(pnlStr.replace(/[^0-9.-]/g, ''));
  if (pnlStr.includes('K')) return num * 1000;
  return num;
};

// Helper function to format number to P&L display string
export const formatPnL = (value) => {
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 2)}K`;
  return `$${abs.toFixed(abs < 100 ? 1 : 0)}`;
};

// Helper function to format large P&L values
export const formatLargePnL = (value) => {
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `$${abs.toFixed(0)}`;
};

// Get data for a specific month
export const getMonthData = (year, month) => {
  const monthData = {};
  
  Object.entries(MOCK_CALENDAR_DATA).forEach(([dateStr, data]) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y === year && m === month + 1) {
      const pnlValue = parsePnL(data.pnl);
      monthData[d] = { ...data, pnlValue };
    }
  });
  
  return monthData;
};

// Calculate statistics for a given month
export const getMonthStats = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let tradingDays = 0;
  const weeklyStats = Array(6).fill(null).map(() => ({ pnl: 0, days: 0, trades: 0 }));

Object.entries(MOCK_CALENDAR_DATA).forEach(([dateStr, data]) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  
  if (y === year && m === month + 1) {
    const pnlValue = parsePnL(data.pnl);
    totalPnL += pnlValue;
    tradingDays++;

    if (data.isLoss) losses++;
    else if (pnlValue > 0) wins++;
    else breakeven++;

    // WEEK INDEX
    const weekIndex = Math.floor((d + firstDay - 1) / 7);

    // ADD PNL
    weeklyStats[weekIndex].pnl += pnlValue;

    // ADD DAY COUNT
    weeklyStats[weekIndex].days++;

    // 📌 ADD TRADE COUNT (NEW)
    weeklyStats[weekIndex].trades += data.trades;
  }
});

  const totalTrades = weeklyStats.reduce((sum, w) => sum + w.trades, 0);

  const winRate = totalTrades > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(2) : 0;
  const profitFactor = losses > 0 ? ((wins / losses) * 100).toFixed(2) : wins > 0 ? '∞' : '0';
  
  // -------- ROI CALCULATION --------
  const accountSize = 100000; // <-- Change to your real trading account size
  const roiPercent = Math.round((totalPnL / accountSize) * 100);

  // --- WEEKLY ROI CALCULATION ---

  weeklyStats.forEach((w) => {
    w.roiPercent = accountSize > 0 ? Math.round((w.pnl / accountSize) * 100) : 0;
  });



  return {
    totalPnL,
    wins,
    losses,
    breakeven,
    tradingDays,
    winRate,
    profitFactor,
    weeklyStats,
    totalTrades, 
    roiPercent,
  };
};

// Get all available months with data
export const getAvailableMonths = () => {
  const months = new Set();
  
  Object.keys(MOCK_CALENDAR_DATA).forEach((dateStr) => {
    const [year, month] = dateStr.split('-').map(Number);
    months.add(`${year}-${month}`);
  });
  
  return Array.from(months).map((m) => {
    const [year, month] = m.split('-').map(Number);
    return { year, month: month - 1 };
  });
};

// Get overall statistics across all data
export const getOverallStats = () => {
  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let totalTrades = 0;

  Object.values(MOCK_CALENDAR_DATA).forEach((data) => {
    const pnlValue = parsePnL(data.pnl);
    totalPnL += pnlValue;
    totalTrades += data.trades;

    if (data.isLoss) losses++;
    else if (pnlValue > 0) wins++;
    else breakeven++;
  });

  const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : 0;
  const profitFactor = losses > 0 ? ((wins / losses) * 100).toFixed(2) : wins > 0 ? '∞' : '0';

  return {
    totalPnL,
    wins,
    losses,
    breakeven,
    totalTrades,
    winRate,
    profitFactor,
    tradingDays: Object.keys(MOCK_CALENDAR_DATA).length,
  };
};



import { supabase } from "../../supabase";

export const MOCK_CALENDAR_DATA = {}; // will be populated dynamically

export const formatLargePnL = (value) => {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `$${abs.toFixed(0)}`;
};

export const formatPnL = (value) => {
  if (!value) return "$0";
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

export const parsePnL = (value) => Number(value || 0);

export const loadUserTrades = async () => {
  const userId = localStorage.getItem("zipha_user_id");
  const activeAccount = JSON.parse(localStorage.getItem("active_account")); // NEW

  if (!userId || !activeAccount?.id) {
    console.log("No user or active account found.");
    return [];
  }

  console.log("Active Account:", activeAccount.name || activeAccount.account_name);

  const { data, error } = await supabase
    .from("zipha-tracker")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", activeAccount.id); // filter by account

  if (error) {
    console.error("Error loading Supabase trades:", error);
    return [];
  }

  console.log(`Fetched ${data.length} trades for account "${activeAccount.name || activeAccount.account_name}"`);
  console.table(data); // pretty table view of trades

  return data;
};

export const populateCalendarData = async () => {
  const trades = await loadUserTrades();
  console.log("Trades fetched from Supabase:", trades);

  // reset calendar data to avoid duplicates
  Object.keys(MOCK_CALENDAR_DATA).forEach((key) => delete MOCK_CALENDAR_DATA[key]);

  trades
    .filter((t) => t.status === "closed")
    .forEach((t) => {
      const dateStr = t.date;
      const pnl = Number(t.pnl || 0);

      if (!MOCK_CALENDAR_DATA[dateStr]) {
        MOCK_CALENDAR_DATA[dateStr] = {
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
          breakeven: 0,
          isLoss: false,
          winRate: "0%",
          account_name: t.account_name || "Unknown" // save account name
        };
      }

      const day = MOCK_CALENDAR_DATA[dateStr];

      day.pnl += pnl;
      day.trades++;

      if (pnl > 0) day.wins++;
      else if (pnl < 0) day.losses++;
      else day.breakeven++;

      const totalOutcome = day.wins + day.losses;
      day.winRate =
        totalOutcome > 0 ? ((day.wins / totalOutcome) * 100).toFixed(2) + "%" : "0%";
      day.isLoss = day.pnl < 0;

      console.log(`Date: ${dateStr}, PnL: ${day.pnl}, Account: ${day.account_name}`);
    });

  console.log("MOCK_CALENDAR_DATA after population:", MOCK_CALENDAR_DATA);
};




// ---------------------- CALCULATIONS ----------------------

// Get data for a specific month
export const getMonthData = (year, month) => {
  const monthData = {};
  Object.entries(MOCK_CALENDAR_DATA).forEach(([dateStr, data]) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y === year && m === month + 1) {
      monthData[d] = { ...data, pnlValue: parsePnL(data.pnl) };
    }
  });
  return monthData;
};

// Get statistics for a month
// UPDATED: Now accepts 'capital' and uses it for ROI calculation.
export const getMonthStats = (year, month, capital = 0) => {
  const monthData = getMonthData(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  let totalPnL = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  const weeklyStats = Array(6)
    .fill(null)
    .map(() => ({ pnl: 0, days: 0, trades: 0 }));

  Object.entries(monthData).forEach(([dayStr, data]) => {
    const d = Number(dayStr);
    const pnl = parsePnL(data.pnl);
    totalPnL += pnl;

    if (data.isLoss) losses++;
    else if (pnl > 0) wins++;
    else breakeven++;

    const weekIndex = Math.floor((d + firstDay - 1) / 7);
    weeklyStats[weekIndex].pnl += pnl;
    weeklyStats[weekIndex].days++;
    weeklyStats[weekIndex].trades += data.trades;
  });

  const totalTrades = weeklyStats.reduce((sum, w) => sum + w.trades, 0);
  const winRate =
    totalTrades > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(2) : 0;
  const profitFactor = losses > 0 ? (wins / losses).toFixed(2) : wins > 0 ? "∞" : "0.00";

  // Calculate Monthly ROI using the passed capital
  const roiPercent = capital > 0 ? ((totalPnL / capital) * 100).toFixed(2) : "0.00";

  // Calculate Weekly ROI using the passed capital
  weeklyStats.forEach((w) => {
    w.roiPercent = capital > 0 ? ((w.pnl / capital) * 100).toFixed(2) : "0.00";
  });

  return {
    totalPnL,
    wins,
    losses,
    breakeven,
    tradingDays: Object.keys(monthData).length,
    winRate,
    profitFactor,
    weeklyStats,
    totalTrades,
    roiPercent,
  };
};
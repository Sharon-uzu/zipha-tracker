import React, {useRef, useEffect} from "react";
import { MOCK_CALENDAR_DATA } from "../data/mockCalendarData";

// Helper to convert "96.8K" / "-4.07K" strings into numbers
const parsePnl = (pnlStr) => {
  if (!pnlStr || pnlStr === "0") return 0;
  const negative = pnlStr.startsWith("-");
  const num = parseFloat(pnlStr.replace(/[^0-9.]/g, ''));
  const value = pnlStr.toUpperCase().includes("K") ? num * 1000 : num;
  return negative ? -value : value;
};


// Map month index to short month name
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export default function YearlyPnlChart({ yearlyPnls, year, theme, calendarData }) {

   const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const PROFIT_COLORS = [
  "#16a34a", // green
  "#facc15",
  "#4338CA",
  "#34d399",
  "#facc15",
  "#4338CA",
  "#14b8a6",
];


const getProfitColor = (monthIndex) =>
  PROFIT_COLORS[monthIndex % PROFIT_COLORS.length];

const monthlyData = MONTHS.map((month, idx) => {
  const monthNum = idx + 1;

  const monthEntries = Object.entries(calendarData).filter(([date]) => {
    const [y, m, day] = date.split("-").map(Number);
    return y === year && m === monthNum;
  });

  const pnl = monthEntries.reduce((sum, [, data]) => sum + parsePnl(data.pnl), 0);
  const pips = pnl || 0; // <-- default to 0

  const color =
    pnl > 0
      ? getProfitColor(idx)
      : pnl < 0
      ? "#ef4444"
      : "#6b7280";

  return { month, pnl, pips, color };
});



useEffect(() => {
    if (!chartRef.current) return;
    const Chart = window.Chart;
    if (!Chart) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const isDark = theme === "dark";

   chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
    type: "bar",
    data: {
      labels: MONTHS,
      datasets: [
        {
          data: monthlyData.map(m => m.pnl), // <-- use your computed monthlyData
          backgroundColor: monthlyData.map(m => m.color), // use colors too
          borderRadius: 4,
        }
      ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                return `$${ctx.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: { color: isDark ? "#fff" : "#000" },
            grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
          },
          x: {
            ticks: { color: isDark ? "#fff" : "#000" },
            grid: { display: false },
          }
        }
      }
    });

    return () => chartInstance.current?.destroy();
  }, [yearlyPnls, theme, year]);




 const CHART_HEIGHT = 135; // stays the same
  const maxPnl = Math.max(...monthlyData.map(m => Math.abs(m.pnl)), 1);

  const getBarHeight = (pnl) => (Math.abs(pnl) / maxPnl) * CHART_HEIGHT;



  const totalPnl = monthlyData.reduce((a, b) => a + b.pnl, 0);
  const totalPips = monthlyData.reduce((a, b) => a + b.pips, 0);
  // const year = 2025;

 const formatPercent = (pnl) => {
  const rawPercent = pnl / 100;

  // clamp between -100 and +100
  const clamped = Math.max(-100, Math.min(100, rawPercent));

  const value = clamped.toFixed(2);

  return clamped >= 0 ? `+${value}%` : `${value}%`;
};


 const formatPips = (pips = 0) =>
    pips >= 0 ? `[+${pips.toFixed(2)} Pips]` : `[${pips.toFixed(2)} Pips]`;


  const hasYearData = monthlyData.some(m => m.pnl !== 0);


  return (
    <div className="chart-container">
      {hasYearData ? (
      <>

      <div className="chart-header">
        <div className="year-info">
          <span className="year-badge">{year}</span>
          <h2 className="chart-title">YEARLY PERFORMANCE REPORT</h2>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-wrapper">
        
        {/* Y-axis */}
        <div className="y-axis">
            <span>100%</span>
            <span className="y-axis-zero">0%</span>
            <span>-100%</span>
        </div>


        <div className="chart-area">
          <div className="zero-line" />

          <div className="bars-container">
            {monthlyData.map((data, idx) => (
              <div key={idx} className="bar-wrapper" style={{ width: "7%" }}>
                
                {data.pnl > 0 && (
                  <div className="bar-positive">
                    <div className="bar-label">
                      <div className="bar-percent text-green">{formatPercent(data.pnl)}</div>
                      <div className="bar-pips">{formatPips(data.pips)}</div>
                    </div>

                    <div
                      className="bar"
                      style={{
                        height: `${getBarHeight(data.pnl)}px`,
                        backgroundColor: data.color,
                        boxShadow: `0 0 20px ${data.color}40`,
                        borderTopLeftRadius: "0.5rem",
                        borderTopRightRadius: "0.5rem",
                      }}
                    />
                  </div>
                )}

                {data.pnl < 0 && (
                  <div className="bar-negative">
                    <div
                      className="bar"
                      style={{
                        height: `${getBarHeight(data.pnl)}px`,
                        backgroundColor: data.color,
                        boxShadow: `0 0 20px ${data.color}40`,
                        borderBottomLeftRadius: "0.5rem",
                        borderBottomRightRadius: "0.5rem",
                      }}
                    />

                    <div className="bar-label">
                      <div className="bar-percent text-red">{formatPercent(data.pnl)}</div>
                      <div className="bar-pips">{formatPips(data.pips)}</div>
                    </div>
                  </div>
                )}

                {data.pnl === 0 && (
                  <div className="bar-zero">
                    <div className="bar-zero-line" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* X-axis */}
          <div className="x-axis">
            {monthlyData.map((data, idx) => (
              <span key={idx} className="x-axis-label" style={{ width: "7%" }}>
                {data.month}
              </span>
            ))}
          </div>
        </div>

        <div className="y-axis-label">PERCENTAGE</div>
      </div>

      {/* Overall ROI */}
      <div className="overall-roi">
        <h3 className="roi-title">OVERALL ROI</h3>
        <div className={`roi-value ${totalPnl >= 0 ? "text-green" : "text-red"}`}>
          {totalPnl >= 0 ? "+" : ""}
          {(totalPnl / 100).toFixed(2)}%
          <span className="roi-pips">
            [{totalPips >= 0 ? "+" : ""}
            {totalPips.toFixed(2)} PIPS]
          </span>
        </div>
      </div>

  </>
) : (
  <div className="no-data-message">
    No trading data for {year}
  </div>
)}

    </div>
  );
}

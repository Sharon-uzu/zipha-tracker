import React, { useEffect, useRef, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { formatLargePnL, parsePnL, MOCK_CALENDAR_DATA } from "../data/mockCalendarData";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart, registerables } from "chart.js";

export default function YearlyBarChart({ year, calendarData  }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

    const yearlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i); // Jan = 0
    return months.map((month) => {
      let pnl = 0;
      let trades = 0;

      Object.entries(MOCK_CALENDAR_DATA).forEach(([dateStr, data]) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        if (y === year && m === month + 1) {
          pnl += parsePnL(data.pnl);
          trades += data.trades;
        }
      });

      return {
        month: new Date(year, month).toLocaleString("en-US", { month: "short" }),
        pnl,
        trades,
      };
    });
  }, [year]);
  
  const totalPnl = yearlyData.reduce((sum, m) => sum + m.pnl, 0);
const totalTrades = yearlyData.reduce((sum, m) => sum + m.trades, 0);

  const accountSize = 100000; 
const yearlyROI = Math.round((totalPnl / accountSize) * 100);


const hasTrades = totalTrades > 0;


  // --- Prepare Yearly Data ---


  const maxAbsPnl = useMemo(() => Math.max(...yearlyData.map((m) => Math.abs(m.pnl))), [yearlyData]);

  const profitColors = ["#10B981", "#FCD34D", "#818CF8", "#06B6D4", "#CA8A04", "#9333EA", "#1E40AF", "#FBBF24", "#10B981", "#3B82F6", "#0EA5E9", "#F97316"];

useEffect(() => {
  if (!chartRef.current) return;
  if (chartInstance.current) chartInstance.current.destroy();

  const ctx = chartRef.current.getContext("2d");
  const accountSize = 100000;

  chartInstance.current = new Chart(ctx, {
    type: "bar",
    data: {
      labels: yearlyData.map((m) => m.month),
      datasets: [
        {
          data: yearlyData.map((m) => m.pnl),
          backgroundColor: yearlyData.map((m, i) =>
            m.pnl >= 0
              ? profitColors[i % profitColors.length]
              : "#DC2626"
          ),
          borderRadius: yearlyData.map((m) =>
            m.pnl >= 0
              ? { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 }
              : { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 }
          ),
          borderSkipped: false,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },

        datalabels: {
          anchor: (ctx) =>
            ctx.dataset.data[ctx.dataIndex] >= 0 ? "end" : "start",
          align: (ctx) =>
            ctx.dataset.data[ctx.dataIndex] >= 0 ? "end" : "start",

          color: "#fff",
          font: { weight: "bold", size: 10 },

          // --- MULTILINE LABEL ---
          formatter: (value) => {
            const percent = (value / accountSize) * 100;

            return [
              `${value >= 0 ? "+" : ""}${value.toFixed(0)} pips`,
              `(${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%)`
            ];
          },
        },
      },

    scales: {
      x: { grid: { display: false } },

      y: {
        beginAtZero: true,
        min: -maxAbsPnl,
        max: maxAbsPnl,

        ticks: {
          callback: (val) => {
            const percent = (val / accountSize) * 100;
            return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
          },
        },

        title: {
          display: true,
          text: "Pips (%)",
          font: { weight: "bold", size: 12 },
          padding: { bottom: 5 },
        },
      },
    },
  },

  plugins: [ChartDataLabels],
});

  return () => chartInstance.current?.destroy();
}, [yearlyData, maxAbsPnl]);


  if (!hasTrades) {
  return (
    <div className="no-data-message">
      <h3>No trading data available for {year}</h3>
    </div>
  );
}


  return (
    <div className="trade-detail-panel">
      <div className="panel-header">
        <h2 className="panel-title">Yearly Trade Report - {year}</h2>
      </div>
      <br/>

      <div className="summary-card">
        <p className={`summary-pnl ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
           {totalPnl >= 0 ? "+" : "-"}{formatLargePnL(Math.abs(totalPnl))}
        </p>
        {/* <p className="summary-label">Total P&L</p>
        <p className="summary-label">Total Trades: {totalTrades}</p> */}
      
      </div>

      <div className="chart-card" style={{ height: "400px" }}>
        <canvas ref={chartRef}></canvas>
      </div>


      {/* <div className="summary-card">
      <p className={`summary-pnl ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
        {totalPnl >= 0 ? "+" : "-"}{formatLargePnL(Math.abs(totalPnl))}
      </p>

      <p className="summary-label">Total P&L</p>
      <p className="summary-label">Total Trades: {totalTrades}</p>

      <p className="summary-label">ROI: {yearlyROI}%</p>
    </div> */}

        <div className="overall-roi">
        <h3 className="roi-title">OVERALL ROI</h3>
        <div className={`roi-value ${totalPnl >= 0 ? "text-green" : "text-red"}`}>
          {totalPnl >= 0 ? "+" : ""}
          {(totalPnl / 100).toFixed(2)}% | {totalTrades} trades

          {/* <span className="roi-pips">
            [{totalPips >= 0 ? "+" : ""}
            {totalPips.toFixed(2)} PIPS]
          </span> */}
        </div>
      </div>

      <div className="panel-actions">
        <button className="btn btn-primary">
          <TrendingUp className="icon-sm icon-mr" />
          Analyze Yearly Trades
        </button>
      </div>
    </div>
  );
}

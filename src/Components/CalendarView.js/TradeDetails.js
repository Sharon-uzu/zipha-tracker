import React, { useEffect, useRef, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { formatLargePnL } from "../data/mockCalendarData";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables, ChartDataLabels);

export default function TradeDetails({ date, monthStats, theme, onAddTrade }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Weekly chart data
  const chartData = useMemo(() => monthStats?.weeklyStats || [], [monthStats]);

  const totalMonthlyPnL = useMemo(
    () => chartData.reduce((sum, w) => sum + w.pnl, 0),
    [chartData]
  );

  const totalMonthlyTrades = useMemo(
    () => chartData.reduce((sum, w) => sum + w.trades, 0),
    [chartData]
  );

  const isMonthProfit = totalMonthlyPnL >= 0;

  // Convert weekly P&L to percentage
  const chartDataPercent = useMemo(() => {
    if (!chartData.length || totalMonthlyPnL === 0)
      return chartData.map((w) => ({ ...w, pnlPercent: 0 }));
    return chartData.map((w) => ({
      ...w,
      pnlPercent: (w.pnl / totalMonthlyPnL) * 100,
    }));
  }, [chartData, totalMonthlyPnL]);

  const profitColors = ["#10B981", "#FCD34D", "#818CF8", "#06B6D4", "#CA8A04"];


  // Force the graph to only show Week 1–5
const limitedChartData = chartDataPercent.slice(0, 5);

 useEffect(() => {
  if (!chartRef.current) return;

  // Check if the month actually has data
  const hasRealData = chartData.some(w => w.pnl !== 0 || w.trades !== 0);
  if (!hasRealData) return;

  if (chartInstance.current) chartInstance.current.destroy();

  chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
    type: "bar",
    data: {
      labels: limitedChartData.map((_, i) => `Week ${i + 1}`), // Only Week 1–5 now
      datasets: [
        {
          data: chartDataPercent.map((w) => w.pnlPercent),
          backgroundColor: chartDataPercent.map((w, i) =>
            w.pnlPercent >= 0
              ? profitColors[i % profitColors.length]
              : "#EF4444"
          ),
          borderRadius: chartDataPercent.map((w) =>
            w.pnlPercent >= 0
              ? { topLeft: 30, topRight: 30, bottomLeft: 0, bottomRight: 0 }
              : { topLeft: 0, topRight: 0, bottomLeft: 30, bottomRight: 30 }
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
          anchor: "end",
          align: "end",
          textAlign:'center',
          font: { weight: "bold", size: 9 },
          color: "#fff",
          formatter: (value, ctx) => {
            const w = chartDataPercent[ctx.dataIndex];
            return `${value.toFixed(2)}%\n(${w.pnl.toFixed(0)} pips)`;
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Percentage",
            color: theme === "dark" ? "#fff" : "#000",
            font: { size: 12, weight: "bold" }
          },
          ticks: {
            callback: (value) => `${value.toFixed(1)}%`,
          },
          suggestedMax: Math.max(...chartDataPercent.map(w => w.pnlPercent)) * 1.25, 
        },
        x: {
          grid: { display: false },
        },
      },

    },
  });

  return () => chartInstance.current?.destroy();
}, [chartDataPercent, theme]);


const noTradesThisMonth = totalMonthlyTrades === 0;



  if (!monthStats) return null;

  return (
    <div className="trade-detail-panel">
      {/* Header */}
      <div className="panel-header">
        <h2 style={{ marginBottom: "10px" }} className="panel-title">
          Monthly Trade Report
        </h2>
      </div>

      {/* Summary */}
      <div className="summary-card">
        <div className="summary-date">
          <p className="summary-date-text">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="summary-label">Monthly Net P&L</p>
          <p className={`summary-pnl ${isMonthProfit ? "text-profit" : "text-loss"}`}>
            {isMonthProfit ? "+" : "-"}
            {formatLargePnL(Math.abs(totalMonthlyPnL))}
          </p>
        </div>
        <div className="summary-stats-group">
          <div className="summary-stat">
            <p className="summary-label">Trades</p>
            <p className="summary-value">{totalMonthlyTrades}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      {!noTradesThisMonth && (
        <div className="chart-card">
          <h3 className="chart-title">Weekly Performance Breakdown</h3>

          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>

          <p className={`chart-footer-text ${isMonthProfit ? "text-profit" : "text-loss"}`}>
            Overall ROI {isMonthProfit ? "+" : "-"}
            {(totalMonthlyPnL / 1000).toFixed(2)}% | {totalMonthlyTrades} trades
          </p>
        </div>
      )}


      {/* Actions */}
      <div className="panel-actions">
        {/* <button className="btn btn-primary">
          <TrendingUp className="icon-sm icon-mr" />
          Analyze Trade Entries
        </button> */}

        <button className="btn btn-primary" onClick={onAddTrade}>
          <TrendingUp className="icon-sm icon-mr" />
          Add Trade
        </button>
      </div>
    </div>
  );
}

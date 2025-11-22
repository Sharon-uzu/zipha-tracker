import React, { useEffect, useRef, useMemo } from "react";
import { X, TrendingUp } from "lucide-react";
import { formatLargePnL } from "../data/mockCalendarData";

export default function TradeDetailModal({ isOpen, onClose, date, monthStats, theme }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Ensure chartData is memoized to prevent unnecessary re-renders
  const chartData = useMemo(() => monthStats?.weeklyStats || [], [monthStats]);

  // Determine if total monthly PnL is profit
  const totalMonthlyPnL = useMemo(
    () => chartData.reduce((sum, w) => sum + w.pnl, 0),
    [chartData]
  );

  const totalMonthlyTrades = useMemo(
    () => chartData.reduce((sum, w) => sum + w.days, 0),
    [chartData]
  );

  const isMonthProfit = totalMonthlyPnL >= 0;

  // Chart.js setup
useEffect(() => {
  if (!isOpen || !chartRef.current || !chartData.length) return;

  const Chart = window.Chart;
  if (!Chart) return;

  if (chartInstance.current) chartInstance.current.destroy();

  const isDark = theme === "dark";

  chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
    type: "bar",
    data: {
      labels: chartData.map((_, i) => `Week ${i + 1}`),
      datasets: [
        {
          data: chartData.map(w => w.pnl),
          backgroundColor: chartData.map(w => (w.pnl >= 0 ? "#10B981" : "#EF4444")),
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const w = chartData[ctx.dataIndex];
              return [`Week ${ctx.dataIndex + 1}: ${formatLargePnL(w.pnl)}`, `Days: ${w.days}`];
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: isDark ? "#555" : "#000000", // Y-axis labels
            font: { weight: "500" }
          },
          grid: {
            color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", // Y-axis grid lines
          },
        },
        x: {
          ticks: {
            color: isDark ? "#555" : "#000000", // X-axis (weeks) labels
            font: { weight: "500" }
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });

  return () => chartInstance.current?.destroy();
}, [chartData, theme, isOpen]);


  if (!isOpen || !monthStats) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Monthly Trade Report</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Summary */}
        <div className="summary-card">
          <div className="summary-date">
            <p className="summary-date-text">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
            <p className="summary-label">Monthly Net P&L</p>
            <p className={`summary-pnl ${isMonthProfit ? "text-profit" : "text-loss"}`}>
              {isMonthProfit ? "+" : "-"}{formatLargePnL(Math.abs(totalMonthlyPnL))}
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
        <div className="chart-card">
          <h3 className="chart-title">Weekly Performance Breakdown</h3>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
          <div className="chart-footer">
            <p className={`chart-footer-text ${isMonthProfit ? "text-profit" : "text-loss"}`}>
              Overall ROI {isMonthProfit ? "+" : "-"}{formatLargePnL(Math.abs(totalMonthlyPnL))} | {totalMonthlyTrades} trades
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-primary">
            <TrendingUp className="icon-sm icon-mr" /> Analyze Trade Entries
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            <X className="icon-sm icon-mr" /> Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}

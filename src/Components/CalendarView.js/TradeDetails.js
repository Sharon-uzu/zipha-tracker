import React, { useEffect, useRef, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { formatLargePnL } from "../data/mockCalendarData";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables, ChartDataLabels);

export default function TradeDetails({ date, monthStats, theme }) {
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

  useEffect(() => {
    if (!chartRef.current || !chartDataPercent.length) return;

    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels: chartDataPercent.map((_, i) => `Week ${i + 1}`),
        datasets: [
          {
            data: chartDataPercent.map((w) => w.pnlPercent),
            backgroundColor: chartDataPercent.map((w, i) =>
              w.pnlPercent >= 0 ? profitColors[i % profitColors.length] : "#EF4444"
            ),
            borderRadius: chartDataPercent.map((w) =>
              w.pnlPercent >= 0
                ? { topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 }
                : { topLeft: 0, topRight: 0, bottomLeft: 12, bottomRight: 12 }
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
            font: { weight: "bold", size: 12 },
            color: "#888888", // default grey for percentage
            formatter: (value, ctx) => {
              const w = chartDataPercent[ctx.dataIndex];
              return `${value.toFixed(2)}%\n${w.pnl.toFixed(0)} pips`;
            },
            listeners: {
              // Draw the second line (pips) in green
              afterDraw: (ctx) => {
                const chart = ctx.chart;
                const datasetIndex = ctx.datasetIndex;
                const index = ctx.dataIndex;
                const meta = chart.getDatasetMeta(datasetIndex);
                const bar = meta.data[index];

                if (!bar) return;

                const canvas = chart.ctx;
                const x = bar.x;
                const y = bar.y - 4; // adjust vertical position above bar

                canvas.save();
                canvas.fillStyle = "#10B981"; // green for pips
                canvas.textAlign = "center";
                canvas.font = "bold 12px sans-serif";
                canvas.fillText(`${chartDataPercent[index].pnl.toFixed(0)} pips`, x, y);
                canvas.restore();
              },
            },
          },
        },
        scales: {
          y: {
            ticks: { callback: (value) => `${value.toFixed(1)}%` },
          },
          x: { grid: { display: false } },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [chartDataPercent, theme]);

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

      {/* Actions */}
      <div className="panel-actions">
        <button className="btn btn-primary">
          <TrendingUp className="icon-sm icon-mr" />
          Analyze Trade Entries
        </button>
      </div>
    </div>
  );
}

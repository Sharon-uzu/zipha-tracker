import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadUserTrades } from '../data/mockCalendarData'; // Re-use the data loading function
import TradeDetailModal from './TradeDetailModal'; // New Modal Component
import { BsArrowLeft } from 'react-icons/bs';

// The Chart.js instance will be stored here
let chartInstance = null; 

export default function AnalyticsDashboard({ onBack, theme }) {
    const [trades, setTrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const chartRef = useRef(null);

    // 1. Fetch all trades on mount
    useEffect(() => {
        const fetchTrades = async () => {
            setIsLoading(true);
            const allTrades = await loadUserTrades();
            // Sort trades by date for cumulative P&L calculation
            allTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
            setTrades(allTrades);
            setIsLoading(false);
        };
        fetchTrades();
    }, []);

    // 2. Calculate Cumulative P&L (%)
    const chartData = useMemo(() => {
        let cumulativePnL = 0;
        const initialCapital = 100000; // Assuming a fixed initial capital
        
        const dataPoints = trades.map(trade => {
            cumulativePnL += Number(trade.pnl || 0);
            const pnlPercent = (cumulativePnL / initialCapital) * 100;
            return {
                date: trade.date,
                pnl: parseFloat(pnlPercent.toFixed(2)),
            };
        });

        // Unique dates (since multiple trades can occur on one day)
        const uniqueDates = dataPoints.reduce((acc, curr) => {
            if (acc.length === 0 || acc[acc.length - 1].date !== curr.date) {
                acc.push(curr);
            } else {
                // Update P&L for the latest entry of the same date
                acc[acc.length - 1].pnl = curr.pnl;
            }
            return acc;
        }, []);

        return {
            labels: uniqueDates.map(d => d.date),
            data: uniqueDates.map(d => d.pnl),
        };
    }, [trades]);

    // 3. Render Chart.js
    useEffect(() => {
        if (!window.Chart || !chartRef.current || chartData.data.length === 0) return;

        const ctx = chartRef.current.getContext('2d');
        const bgColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const borderColor = theme === 'dark' ? '#10b981' : '#059669'; 
        const textColor = theme === 'dark' ? '#ccc' : '#333';

        // Destroy existing chart instance before creating a new one
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Cumulative P&L (%)',
                    data: chartData.data,
                    borderColor: borderColor,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.1,
                    fill: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: bgColor }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Cumulative P&L (%)',
                            color: textColor
                        },
                        ticks: { color: textColor, callback: (value) => value + '%' },
                        grid: { color: bgColor }
                    }
                }
            }
        });

        return () => {
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        };

    }, [chartData, theme]); // Re-run when data or theme changes

    const openTradeDetails = (trade) => setSelectedTrade(trade);
    const closeTradeDetails = () => setSelectedTrade(null);

    const onTradeUpdate = (updatedTrade) => {
        // Find and replace the trade in the local state
        setTrades(prevTrades => prevTrades.map(t => 
            t.id === updatedTrade.id ? updatedTrade : t
        ));
        closeTradeDetails();
    };

    const onTradeDelete = (deletedTradeId) => {
        // Remove the trade from the local state
        setTrades(prevTrades => prevTrades.filter(t => t.id !== deletedTradeId));
        closeTradeDetails();
    };

    return (
        <div className={`analytics-dashboard ${theme === 'light' ? 'light-mode' : ''}`}>
            <header className="analytics-header">
                <button onClick={onBack} className="back-btn"><BsArrowLeft /> Back</button>
                <h2>📈 Trade Analytics</h2>
            </header>

            {isLoading ? (
                <div className="loading-state">Loading Trades...</div>
            ) : (
                <>
                    {/* Line Graph Section */}
                    <div className="chart-container">
                        <h3>Cumulative P&L Over Time (%)</h3>
                        <div className="chart-wrapper">
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>
                    

                    {/* Trade List Section */}
                    <div className="trade-list-section">
                        <h3>Detailed Trade Analysis ({trades.length} Trades)</h3><br/>
                        <div className="trade-list">
                            {trades.map(trade => (
                                <div key={trade.id} className={`trade-win ${Number(trade.pnl) > 0 ? 'win' : Number(trade.pnl) < 0 ? 'loss' : 'breakeven'}`}>
                                    <div className="trade-summary">
                                        <span className="trade-date">Date:<br/>{trade.date}</span>
                                        <span className="trade-asset"><span className='trade-date'>Type:</span><br/>{trade.asset_type}</span>
                                        <span className="trade-detail"><span className='trade-date'>Entry:</span><br/>${trade.entry_price}</span>
                                        <span className="trade-detail"><span className='trade-date'>Exit:</span><br/>${trade.exit_price}</span>
                                        <span className="trade-detail"><span className='trade-date'>Exit:</span> <br/>{trade.lot_size}</span>
                                        <span className={`trade-date ${Number(trade.pnl) >= 0 ? 'green' : 'red'}`}>P$L:<br/>{Number(trade.pnl) >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}</span>
                                        <button 
                                            className="view-details-btn" 
                                            onClick={() => openTradeDetails(trade)}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                </>
            )}

            {/* Trade Detail Modal */}
            {selectedTrade && (
                <TradeDetailModal
                    trade={selectedTrade}
                    onClose={closeTradeDetails}
                    onUpdate={onTradeUpdate}
                    onDelete={onTradeDelete}
                    theme={theme}
                />
            )}
        </div>
    );
}
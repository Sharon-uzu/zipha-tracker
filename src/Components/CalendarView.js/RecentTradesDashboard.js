import React, { useState, useEffect, useMemo } from 'react';
// Assuming you move this import to a shared data file or define the Supabase logic here
import { loadUserTrades } from '../data/mockCalendarData'; 
import { 
    AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, 
    ReferenceLine 
} from 'recharts';
import { Eye, TrendingUp, TrendingDown } from 'lucide-react';
import TradeDetailModal from './TradeDetailModal';
import TradeEditModal from './TradeEditModal'

// --- CONFIG ---
const TICK_INTERVAL = 50; // Interval for dollar spacing
// ---

// Helper function to format currency for the tooltip (full detail)
const formatCurrencyTooltip = (value) => {
    const numValue = Number(value); 
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
    }).format(numValue);
};

// 💰 Helper function to format currency for the Y-Axis (abbreviated: $23.2K)
const formatAbbreviatedCurrency = (value) => {
    const absValue = Math.abs(Number(value));
    const sign = Number(value) < 0 ? '-' : '';

    if (absValue >= 1000000) {
        return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    }
    if (absValue >= 1000) {
        // Example: 23200 -> $23.2K
        return `${sign}${(absValue / 1000).toFixed(1)}K`;
    }
    // For smaller numbers (less than 1000)
    return `${sign}$${absValue.toFixed(0)}`;
};

export default function RecentTradesDashboard({ onTradeView, theme }) {
    const [trades, setTrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startingCapital, setStartingCapital] = useState(0);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("zipha_user"));
        if (user && user.capital) {
            setStartingCapital(Number(user.capital));
        } else {
            setStartingCapital(0);
        }
    }, []);

    // 1. Fetch trades from Supabase on mount
    useEffect(() => {
        const fetchTrades = async () => {
            setIsLoading(true);
            const allTrades = await loadUserTrades();
            allTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
            setTrades(allTrades);
            setIsLoading(false);
        };
        fetchTrades();
    }, []);

    // 2. Calculate Cumulative P&L ($) and filter for chart/list
    const { chartData, recentTrades } = useMemo(() => {
        let cumulativePnL = 0;
        const cumulativeData = [];
        const dailyPnLMap = {};

        // Group P&L by day
        for (const trade of trades) {
            dailyPnLMap[trade.date] = (dailyPnLMap[trade.date] || 0) + Number(trade.pnl || 0);
        }

        // Calculate cumulative P&L for unique dates
        const sortedDates = Object.keys(dailyPnLMap).sort((a, b) => new Date(a) - new Date(b));

        // Add starting point for chart
        cumulativeData.push({ date: 'Start', pnl: 0 }); 

        for (const date of sortedDates) {
            cumulativePnL += dailyPnLMap[date];
            cumulativeData.push({ 
                date: date,
                pnl: cumulativePnL
            });
        }

        // Filter for last 4 chart points
        const filteredChartData = cumulativeData.slice(cumulativeData.length > 4 ? cumulativeData.length - 4 : 0);

        // Last 4 actual trades sorted newest first
        const recentTradesList = [...trades]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4); 

        return { 
            chartData: filteredChartData, 
            recentTrades: recentTradesList 
        };
    }, [trades]);

    // Chart logic
    const axisColor = theme === 'dark' ? '#999' : '#333';

    // Calculate ticks based on P&L values
    const getPnLTicks = () => {
        if (chartData.length <= 1) return [0]; 

        const pnlValues = chartData.map(d => d.pnl);
        const dataMin = Math.min(...pnlValues, 0);
        const dataMax = Math.max(...pnlValues, 0);

        const ticks = [];
        const start = Math.floor(dataMin / TICK_INTERVAL) * TICK_INTERVAL;
        const end = Math.ceil(dataMax / TICK_INTERVAL) * TICK_INTERVAL;

        for (let i = start; i <= end; i += TICK_INTERVAL) {
            ticks.push(i);
        }
        return ticks;
    };


    const calculateOffset = () => {
        if (chartData.length === 0) return '50%';
        const dataMax = Math.max(...chartData.map(item => item.pnl), 0);
        const dataMin = Math.min(...chartData.map(item => item.pnl), 0);
        const range = dataMax - dataMin;
        if (range === 0) return '50%';
        const offset = (dataMax / range) * 100; 
        return `${offset}%`;
    };

    const gradientOffset = calculateOffset();

    const [viewTrade, setViewTrade] = useState(null);
    const [editTrade, setEditTrade] = useState(null);

    // Button click handler
    const handleTradeClick = (trade) => {
        if (trade.status.toLowerCase() === 'open') {
            setEditTrade(trade);
        } else {
            setViewTrade(trade);
        }
    };

    // Handler to update trades list after an edit
    const handleTradeUpdate = (updatedTrade) => {
        setTrades(prev => prev.map(t => t.id === updatedTrade.id ? updatedTrade : t));
        setEditTrade(null);
    }


    if (isLoading) {
        return <div className={`recent-trades-dashboard ${theme === 'dark' ? '' : 'light-mode'}`}>Loading Recent Trades...</div>;
    }

    return (
        <div className={`recent-trades-dashboard ${theme === 'dark' ? '' : 'light-mode'}`}>
            
            <div className="recent-chart-card">
                <h3 className="card-title">Daily Net Cumulative P&L ($) - Last {chartData.length} Points</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart 
                        data={chartData} 
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke={axisColor} 
                            tickLine={false}
                            tickFormatter={(tick) => {
                                if (tick === 'Start') return ''; 
                                const parts = tick.split('-'); 
                                return parts.length > 2 ? `${parts[1]}/${parts[2]}` : tick;
                            }}
                        />
                        <YAxis 
                            stroke={axisColor} 
                            tickLine={false}
                            ticks={getPnLTicks()} 
                            domain={['dataMin', 'dataMax']} 
                            // Use the abbreviated currency format
                            tickFormatter={formatAbbreviatedCurrency} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#1f2937' : '#fff', 
                                border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`, 
                                borderRadius: '4px' 
                            }}
                            // Tooltip retains full detailed currency
                            formatter={(value) => [formatCurrencyTooltip(value), "Cumulative P&L"]}
                            labelFormatter={(label) => `Date: ${label === 'Start' ? 'Initial' : label}`}
                        />
                        <defs>
                            <linearGradient id="colorPnLFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.8}/>
                            </linearGradient>
                            <linearGradient id="colorPnLLine" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={gradientOffset} stopColor="#10b981"/>
                                <stop offset={gradientOffset} stopColor="#ef4444"/>
                            </linearGradient>
                        </defs>
                        <Area 
                            type="monotone" 
                            dataKey="pnl" 
                            stroke="url(#colorPnLLine)" 
                            strokeWidth={2} 
                            fill="url(#colorPnLFill)" 
                            dot={false}
                            baseLine={0} 
                        />
                        <ReferenceLine y={0} stroke={theme === 'dark' ? '#555' : '#ccc'} strokeDasharray="3 3" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>



            {/* Recent Trades List */}
            <div className="recent-details-card">
                <h3 className="card-title">Recent Trades ({recentTrades.length})</h3>
                <div className="trade-list">
                    {recentTrades.map((trade) => (
                        <div key={trade.id} className="trade-item">
                            <div className={`pnl-icon ${Number(trade.pnl) > 0 ? 'win' : 'loss'}`}>
                                {Number(trade.pnl) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            </div>
                            
                            {/* Trade Pair */}
                            <div className="trade-info">
                                <div className="trade-pair">{trade.pair || trade.asset_type}</div>
                                <div className="trade-date">{trade.date}</div>
                            </div>

                            {/* Status Column */}
                            <div className={`trade-status-column ${trade.status.toLowerCase()}`}>
                                {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                            </div>

                            {/* PnL Column */}
                            <div className="trade-result">
                                <span className={`pnl-value ${Number(trade.pnl) >= 0 ? 'green' : 'red'}`}>
                                    {/* List still uses the detailed currency format */}
                                    {formatCurrencyTooltip(Number(trade.pnl))} 
                                </span>
                            </div>

                            {/* View Button */}
                            <button
                                className="view-details-btn"
                                onClick={() => handleTradeClick(trade)}
                            >
                                <Eye size={16} /> {trade.status.toLowerCase() === 'open' ? 'Edit' : 'View'}
                            </button>


                        </div>
                    ))}
                </div>
            </div>

            {viewTrade && (
            <TradeDetailModal
                    trade={viewTrade}
                    onClose={() => setViewTrade(null)}
                    theme={theme}
                />
            )}

            {editTrade && (
                <TradeEditModal
                    trade={editTrade}
                    onClose={() => setEditTrade(null)}
                    onUpdate={handleTradeUpdate}
                    theme={theme}
                />
            )}

        </div>
    );
}
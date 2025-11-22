// This file simulates fetching data based on the selected month
const monthlyData = {
    // Data for a high-performing month (e.g., April 2025)
    '2025-04': {
        header: {
            netPnl: '$295,236.61',
            tradeWinPercent: '92.86%',
            profitFactor: '153.01',
            totalDays: 14,
        },
        weekly: [
            { week: 'Week 1', pnl: '96.8K', days: 2, type: 'positive' },
            { week: 'Week 2', pnl: '-4.07K', days: 2, type: 'negative' },
            { week: 'Week 3', pnl: '25.8K', days: 4, type: 'positive' },
            { week: 'Week 4', pnl: '30.9K', days: 3, type: 'positive' },
            { week: 'Week 5', pnl: '146K', days: 3, type: 'positive' },
        ],
    },
    // Data for a low-performing/different month (e.g., March 2025)
    '2025-03': {
        header: {
            netPnl: '$12,500.50',
            tradeWinPercent: '55.00%',
            profitFactor: '1.20',
            totalDays: 7,
        },
        weekly: [
            { week: 'Week 1', pnl: '2.5K', days: 3, type: 'positive' },
            { week: 'Week 2', pnl: '-1.5K', days: 2, type: 'negative' },
            { week: 'Week 3', pnl: '10.0K', days: 2, type: 'positive' },
        ],
    },
    // Add more months as needed...
};

// Function to simulate fetching data for a given date
export const getMonthlyData = (date) => {
    // Format the date to YYYY-MM key (e.g., 2025-04)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    
    // Return data or a default structure if the key doesn't exist
    return monthlyData[key] || { 
        header: { netPnl: '$0.00', tradeWinPercent: '0.00%', profitFactor: '0.00', totalDays: 0 },
        weekly: [{ week: 'No Data', pnl: '0.00', days: 0, type: 'zero' }]
    };
};
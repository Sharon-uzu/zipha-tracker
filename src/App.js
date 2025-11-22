import React, { useState, useEffect, useCallback } from "react";

import TradeDetailModal from "./Components/TradeDetailModal/TradeDetailModal";
import './App.css'

import { MOCK_CALENDAR_DATA } from "./Components/data/mockCalendarData";
import TradingCalendar from "./Components/CalendarView.js/TradingCalendar";

const ChartJS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js";

export default function App() {
    const [date, setDate] = useState(new Date(2025, 3, 1));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [theme, setTheme] = useState("dark");
    const [viewMode, setViewMode] = useState("month"); // "month" | "year"

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    // Load Chart.js into window
    useEffect(() => {
        const script = document.createElement("script");
        script.src = ChartJS_CDN;
        script.onload = () => console.log("Chart.js Loaded.");
        script.onerror = () => console.error("Failed to load Chart.js.");
        document.body.appendChild(script);

        return () => document.body.removeChild(script);
    }, []);

        const openTradeModal = useCallback((date, dailyData, monthStats) => {
        if (!dailyData) return;
        setSelectedTrade({ date, data: dailyData, monthStats });
        setIsModalOpen(true);
        }, []);


    const closeTradeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedTrade(null);
    }, []);

    return (
        <div className={`root-app ${theme === "light" ? "light-mode" : ""}`}>
            {/* <CalendarView
                date={date}
                setDate={setDate}
                viewMode={viewMode}
                setViewMode={setViewMode}
                calendarData={MOCK_CALENDAR_DATA}
                openTradeModal={openTradeModal}
                theme={theme}
                toggleTheme={toggleTheme}
            /> */}

            <TradingCalendar 
                // className={isLightMode ? 'light-mode' : ''}
                onDayClick={openTradeModal} 
                setAppDate={setDate}
                appDate={date}
            />


            {selectedTrade && (
                <TradeDetailModal
                    isOpen={isModalOpen}
                    onClose={closeTradeModal}
                    date={selectedTrade.date}
                    data={selectedTrade.data}      // daily data
                    monthStats={selectedTrade.monthStats}  // monthly stats for chart
                    theme={theme}
                />
                )}

        </div>
    );
}

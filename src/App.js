import React, { useState, useEffect, useCallback } from "react";

import TradingCalendar from "./Components/CalendarView.js/TradingCalendar";
import TradeEntryForm from "./Components/CalendarView.js/TradeEntryForm";
import AuthForm from "./Components/CalendarView.js/AuthForm";

import './App.css';

const ChartJS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js";




export default function App() {
    const [date, setDate] = useState(new Date(2025, 3, 1));
    const [showTradeForm, setShowTradeForm] = useState(false);

    const [appView, setAppView] = useState("calendar"); 


    // Load Chart.js
    useEffect(() => {
        const script = document.createElement("script");
        script.src = ChartJS_CDN;
        script.onload = () => console.log("Chart.js Loaded.");
        script.onerror = () => console.error("Failed to load Chart.js.");
        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);

    const openTradeForm = () => setShowTradeForm(true);
    const closeTradeForm = () => setShowTradeForm(false);

   const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("zipha_user_id")
  );

  // If not logged in, show Auth screen
  if (!isAuthenticated) {
    return (
      <AuthForm
        onLoginSuccess={() => {
          console.log("Logged in user ID:", localStorage.getItem("zipha_user_id"));
          setIsAuthenticated(true);
        }}
      />
    );
  }


  // Handlers for switching views
    const openAnalytics = () => setAppView("analytics");
    const closeAnalytics = () => setAppView("calendar"); 
    const toggleAppView = () => {
        setAppView(prevView => prevView === "calendar" ? "analytics" : "calendar");
    };
    // 👇 Otherwise show the actual app
    return (
        <div className="root-app">
            <TradingCalendar
                onDayClick={() => {}}
                setAppDate={setDate}
                appDate={date}
                openTradeForm={openTradeForm}
                onAddTrade={openTradeForm}
                onLogout={() => {
                    localStorage.removeItem("zipha_user_id");
                    window.location.reload();
                }}
                onAnalyticsClick={toggleAppView}
                currentView={appView}
            />



            {showTradeForm && (
                <TradeEntryForm 
                    onClose={closeTradeForm}
                    onSubmit={(trade) => {
                        console.log("New trade saved:", trade);
                        closeTradeForm();
                    }}
                />
            )}
        </div>
    );
}

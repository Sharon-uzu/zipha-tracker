import React, { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const CalendarTile = ({ date, dayData, isCurrentMonth, onClick }) => {
    const isToday = useMemo(() => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }, [date]);

    let tileClass = "tile";
    let pnlClass = "";

    const hasTrades = !!dayData;

    if (!isCurrentMonth) tileClass += " tile-inactive";
    else {
        if (hasTrades) {
            const pnlValue = parseFloat(dayData.pnl.replace(/[^0-9.-]+/g, ""));
            tileClass += " has-trades";

            if (pnlValue > 0) {
                tileClass += " tile-profit-border";
                pnlClass = "text-profit";
            } else if (pnlValue < 0) {
                tileClass += " tile-loss-border";
                pnlClass = "text-loss";
            } else {
                tileClass += " tile-break-even-border";
                pnlClass = "text-break-even";
            }
        }
        if (isToday) tileClass += " is-today";
    }

    return (
        <div className={tileClass} onClick={hasTrades ? onClick : undefined}>
            <div className={`tile-date ${isToday ? "text-indigo" : ""}`}>
                {date.getDate()}
            </div>

            {hasTrades && (
                <div className="tile-content">
                    <div className={`tile-pnl ${pnlClass}`}>
                        {dayData.isLoss ? (
                            <TrendingDown className="icon-xs icon-mr" />
                        ) : (
                            <TrendingUp className="icon-xs icon-mr" />
                        )}
                        {dayData.pnl}
                    </div>
                    <div className="tile-trades">
                        {dayData.trades} trade{dayData.trades !== 1 && "s"}
                    </div>
                    <div className="tile-winrate">{dayData.winRate}</div>
                </div>
            )}

            {!isCurrentMonth && <div className="tile-overlay"></div>}
        </div>
    );
};

export default CalendarTile;

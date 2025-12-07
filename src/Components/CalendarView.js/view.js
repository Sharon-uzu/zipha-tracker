import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Save, X } from 'lucide-react';
import { supabase } from '../../supabase';

const PIP_SPECIFICATIONS = {
    "EUR/USD": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", assetType: "Forex" },
    "GBP/USD": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", assetType: "Forex" },
    "AUD/USD": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", assetType: "Forex" },
    "NZD/USD": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", assetType: "Forex" },
    "EUR/GBP": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "GBP", assetType: "Forex" },

    "USD/JPY": { pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", assetType: "Forex" },
    "EUR/JPY": { pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", assetType: "Forex" },
    "GBP/JPY": { pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", assetType: "Forex" },

    "USD/CAD": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "CAD", assetType: "Forex" },
    "USD/CHF": { pipSize: 0.0001, contractSize: 100000, quoteCurrency: "CHF", assetType: "Forex" },

    "XAU/USD": { pipSize: 0.01, contractSize: 100, quoteCurrency: "USD", assetType: "Commodity" }, // 0.01 -> $1 per pip per lot
    "XAG/USD": { pipSize: 0.01, contractSize: 5000, quoteCurrency: "USD", assetType: "Commodity" }, // 0.01 -> $50 per pip per lot

    "US30": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
    "NAS100": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
    "SPX500": { pipSize: 0.1, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
    "GER40": { pipSize: 1.0, contractSize: 1, quoteCurrency: "EUR", assetType: "Indices" },

    // Crypto (simplified)
    "BTC/USD": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Crypto" },
    "ETH/USD": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Crypto" },
};

const EXCHANGE_RATES_TO_USD = {
    "USD": 1.0,
    "JPY": 1 / 150.0,   
    "CAD": 1 / 1.35,    
    "EUR": 1.08,        
    "GBP": 1.25,        
    "CHF": 1 / 0.88     
};

export default function TradeEntryForm({ onSubmit, onClose, initialDate = null }) {
    const [formData, setFormData] = useState({
        date: initialDate || new Date().toISOString().split("T")[0],

        entryTime: "",
        exitTime: "",

        duration: "day",
        entryDate: "",
        exitDate: "",

        assetType: "Forex",
        pair: "",
        direction: "long",

        entryPrice: "",
        exitPrice: "",
        lotSize: "",
        stopLoss: "",
        takeProfit: "",

        // Calculated
        stopLossPips: "",
        takeProfitPips: "",
        pips: "",
        pnl: "",

        // Risk fields
        riskType: "percentage", // percentage | money | lot
        riskValue: 1, // meaning depends on riskType
        riskMoney: "0.00", // $ risk (calculated)
        projectedPnlAtTP: "0.00", // $ projected profit at TP
        projectedPnlAtSL: "0.00", // $ projected loss at SL (should match riskMoney when lot derived from risk)
        rr: "", // reward to risk ratio

        status: "open",
        outcome: "win",

        notes: "",
        setup: "",

        beforeScreenshot: null,
        afterScreenshot: null,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const safeParse = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    };

    const round = (v, dp = 2) => {
        const p = Math.pow(10, dp);
        return Math.round((v + Number.EPSILON) * p) / p;
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    useEffect(() => {
        const { entryPrice, stopLoss, takeProfit, pair } = formData;
        if (!pair || !entryPrice) {
            setFormData(prev => ({ ...prev, stopLossPips: "", takeProfitPips: "" }));
            return;
        }

        const specs = PIP_SPECIFICATIONS[pair];
        if (!specs) return;

        const entry = safeParse(entryPrice);
        const sl = safeParse(stopLoss);
        const tp = safeParse(takeProfit);

        const pipMultiplier = 1 / specs.pipSize;

        if (entry && sl) {
            const slPips = Math.abs(entry - sl) * pipMultiplier;
            setFormData(prev => ({ ...prev, stopLossPips: round(slPips, 2).toFixed(2) }));
        } else {
            setFormData(prev => ({ ...prev, stopLossPips: "" }));
        }

        if (entry && tp) {
            const tpPips = Math.abs(tp - entry) * pipMultiplier;
            setFormData(prev => ({ ...prev, takeProfitPips: round(tpPips, 2).toFixed(2) }));
        } else {
            setFormData(prev => ({ ...prev, takeProfitPips: "" }));
        }
    }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.pair]);

    const calculateRiskAndLot = () => {
        const specs = formData.pair ? PIP_SPECIFICATIONS[formData.pair] : null;
        const stopLossPips = safeParse(formData.stopLossPips);
        const riskValueRaw = safeParse(formData.riskValue);

        if (!specs || stopLossPips <= 0 || !formData.pair) {
            if (formData.riskType === "lot") {
                const lotsManual = safeParse(formData.riskValue);
                if (lotsManual > 0 && stopLossPips > 0) {
                    const pipValueUsdPerLot = specs.contractSize * specs.pipSize * (EXCHANGE_RATES_TO_USD[specs.quoteCurrency] || 1.0);
                    const riskPerLot = pipValueUsdPerLot * stopLossPips;
                    const riskMoneyCalc = lotsManual * riskPerLot;
                    setFormData(prev => ({
                        ...prev,
                        lotSize: round(lotsManual, 2).toFixed(2),
                        riskMoney: round(riskMoneyCalc, 2).toFixed(2)
                    }));
                }
            } else {
                setFormData(prev => ({ ...prev, lotSize: "", riskMoney: "0.00" }));
            }
            return;
        }

        const account = JSON.parse(localStorage.getItem("active_account"));
        const capital = account ? safeParse(account.capital) : 0;
        if (formData.riskType === "percentage" && capital <= 0) {
            return;
        }
        const quoteCurrency = specs.quoteCurrency;
        const conv = EXCHANGE_RATES_TO_USD[quoteCurrency] || 1.0; // USD per 1 quote unit
        const pipValueUsdPerLot = specs.contractSize * specs.pipSize * conv; // USD per pip per 1 lot
        const riskPerLotUsd = pipValueUsdPerLot * stopLossPips; // USD risk if 1 lot hits SL

        let riskMoney = 0;
        let lotSize = 0;

        if (formData.riskType === "percentage") {
            riskMoney = (capital * riskValueRaw) / 100;
            lotSize = riskPerLotUsd > 0 ? (riskMoney / riskPerLotUsd) : 0;
        } else if (formData.riskType === "money") {
            riskMoney = riskValueRaw;
            lotSize = riskPerLotUsd > 0 ? (riskMoney / riskPerLotUsd) : 0;
        } else if (formData.riskType === "lot") {
            lotSize = riskValueRaw;
            riskMoney = lotSize * riskPerLotUsd;
        }

        lotSize = Math.max(0, lotSize);
        riskMoney = Math.max(0, riskMoney);

        setFormData(prev => ({
            ...prev,
            lotSize: lotSize ? round(lotSize, 2).toFixed(2) : "",
            riskMoney: round(riskMoney, 2).toFixed(2)
        }));
    };

    useEffect(() => {
        calculateRiskAndLot();
    }, [formData.riskType, formData.riskValue, formData.stopLossPips, formData.pair]);

   useEffect(() => {
    const { entryPrice, exitPrice, direction, pair } = formData;

    if (!entryPrice || !exitPrice || !pair) {
        setFormData(prev => ({ ...prev, pips: "" }));
        return;
    }

    const specs = PIP_SPECIFICATIONS[pair];
    if (!specs) return;

    const entry = safeParse(entryPrice);
    const exit = safeParse(exitPrice);
    const pipMultiplier = 1 / specs.pipSize;

    let pipDifference =
        direction === "long"
            ? (exit - entry) * pipMultiplier
            : (entry - exit) * pipMultiplier;

    if (Math.abs(pipDifference) < 0.000001) pipDifference = 0;

    setFormData(prev => ({
        ...prev,
        pips: round(pipDifference, 2).toFixed(2)
    }));
}, [
    formData.entryPrice,
    formData.exitPrice,
    formData.direction,
    formData.pair
]);

    const calculatePnLAndProjections = () => {
        const specs = formData.pair ? PIP_SPECIFICATIONS[formData.pair] : null;
        if (!specs) {
            setFormData(prev => ({ ...prev, pnl: "", projectedPnlAtTP: "0.00", projectedPnlAtSL: "0.00", rr: "" }));
            return;
        }

        const pipCount = safeParse(formData.pips); // realized pips (if closed)
        const slPips = safeParse(formData.stopLossPips);
        const tpPips = safeParse(formData.takeProfitPips);
        const lots = safeParse(formData.lotSize);

        const conv = EXCHANGE_RATES_TO_USD[specs.quoteCurrency] || 1.0;
        const pipValueUsdPerLot = specs.contractSize * specs.pipSize * conv; // USD per pip per lot

        let netPnL = 0;
        if (pipCount !== 0 && lots !== 0 && formData.status === "closed") {
            netPnL = pipCount * pipValueUsdPerLot * lots;
        }

        let projectedAtTP = 0;
        let projectedAtSL = 0;
        if (tpPips > 0 && lots > 0) projectedAtTP = tpPips * pipValueUsdPerLot * lots;
        if (slPips > 0 && lots > 0) projectedAtSL = slPips * pipValueUsdPerLot * lots;

        let rr = "";
        if (slPips > 0 && tpPips > 0) {
            const rrRaw = tpPips / slPips;
            rr = Number.isFinite(rrRaw) ? round(rrRaw, 2).toFixed(2) : "";
        }

        setFormData(prev => ({
            ...prev,
            pnl: round(netPnL, 2).toFixed(2),
            projectedPnlAtTP: round(projectedAtTP, 2).toFixed(2),
            projectedPnlAtSL: round(projectedAtSL, 2).toFixed(2),
            rr
        }));
    };

    useEffect(() => {
        calculatePnLAndProjections();
    }, [formData.pips, formData.lotSize, formData.pair, formData.status, formData.takeProfitPips, formData.stopLossPips]);


    useEffect(() => {
    const specs = formData.pair ? PIP_SPECIFICATIONS[formData.pair] : null;

    const entry = safeParse(formData.entryPrice);
    const exit = safeParse(formData.exitPrice);
    const slPrice = safeParse(formData.stopLoss);
    const tpPrice = safeParse(formData.takeProfit);

    const lots = safeParse(formData.lotSize);
    const riskValueRaw = safeParse(formData.riskValue);

    const account = JSON.parse(localStorage.getItem("active_account"));
    const capital = account ? safeParse(account.capital) : 0;

    let stopLossPips = "";
    let takeProfitPips = "";
    let pipCount = "";
    let pipValueUsdPerLot = 0;
    let riskMoney = 0;
    let newLotSize = formData.lotSize;
    let projectedTP = 0;
    let projectedSL = 0;
    let pnl = "";
    let rr = "";

    if (specs) {
        const pipMult = 1 / specs.pipSize;
        const conv = EXCHANGE_RATES_TO_USD[specs.quoteCurrency] || 1;

        pipValueUsdPerLot = specs.contractSize * specs.pipSize * conv;

        // SL pips
        if (entry && slPrice) {
            stopLossPips = round(Math.abs(entry - slPrice) * pipMult, 2).toFixed(2);
        }

        // TP pips
        if (entry && tpPrice) {
            takeProfitPips = round(Math.abs(tpPrice - entry) * pipMult, 2).toFixed(2);
        }

        // Entry → Exit pips (auto even when open)
        if (entry && exit) {
            let diff =
                formData.direction === "long"
                    ? (exit - entry) * pipMult
                    : (entry - exit) * pipMult;

            if (Math.abs(diff) < 0.000001) diff = 0;
            pipCount = round(diff, 2).toFixed(2);
        }
    }

    // ------------------------
    // 2. Risk → Lot calculation
    // ------------------------
    const slP = safeParse(stopLossPips);
    const oneLotRisk = pipValueUsdPerLot * slP; // USD risk per lot

    if (specs && slP > 0) {
        if (formData.riskType === "percentage") {
            if (capital > 0) {
                riskMoney = (capital * riskValueRaw) / 100;
                newLotSize = oneLotRisk > 0 ? riskMoney / oneLotRisk : 0;
            }
        } else if (formData.riskType === "money") {
            riskMoney = riskValueRaw;
            newLotSize = oneLotRisk > 0 ? riskMoney / oneLotRisk : 0;
        } else if (formData.riskType === "lot") {
            newLotSize = riskValueRaw;
            riskMoney = newLotSize * oneLotRisk;
        }
    }

    // normalize
    newLotSize = newLotSize ? round(newLotSize, 2).toFixed(2) : "";
    riskMoney = round(riskMoney, 2).toFixed(2);

    const tpP = safeParse(takeProfitPips);
    const lotNum = safeParse(newLotSize);

    if (tpP > 0 && lotNum > 0) {
        projectedTP = round(tpP * pipValueUsdPerLot * lotNum, 2).toFixed(2);
    }

    if (slP > 0 && lotNum > 0) {
        projectedSL = round(slP * pipValueUsdPerLot * lotNum, 2).toFixed(2);
    }

    // RR
    if (slP > 0 && tpP > 0) {
        rr = round(tpP / slP, 2).toFixed(2);
    }

    if (pipCount !== "" && lotNum > 0 && specs) {
        pnl = round(safeParse(pipCount) * pipValueUsdPerLot * lotNum, 2).toFixed(2);
    }

    setFormData(prev => ({
        ...prev,
        stopLossPips,
        takeProfitPips,
        pips: pipCount,
        riskMoney,
        lotSize: newLotSize,
        projectedPnlAtTP: projectedTP,
        projectedPnlAtSL: projectedSL,
        rr,
        pnl
    }));
}, [
    formData.pair,
    formData.entryPrice,
    formData.exitPrice,
    formData.stopLoss,
    formData.takeProfit,
    formData.direction,
    formData.riskType,
    formData.riskValue
]);

    const validate = () => {
        const e = {};
        if (!formData.date) e.date = "Trade date is required";
        if (!formData.pair) e.pair = "Pair is required";
        if (!formData.entryPrice) e.entryPrice = "Entry price required";
        if (formData.riskType === "lot" && !formData.lotSize) e.lotSize = "Lot size required";

        if (formData.status === "closed") {
            if (!formData.exitTime) e.exitTime = "Exit time required";
            if (formData.duration === "swing" && !formData.exitDate) e.exitDate = "Exit date required";
            if (!formData.exitPrice) e.exitPrice = "Exit price required";
            if (!formData.pips) e.pips = "Pips required";
            if (!formData.pnl) e.pnl = "PnL required";
            if (!formData.outcome) e.outcome = "Outcome required";
            if (!formData.afterScreenshot) e.afterScreenshot = "After-trade screenshot required";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prev => ({ ...prev, [name]: files[0] }));
    };

    async function uploadScreenshot(file, userId, tradeId, type) {
        if (!file) return null;
        const fileExt = file.name.split('.').pop();
        const extension = fileExt || 'png';
        const filePath = `${userId}/${tradeId}/${type}.${extension}`;

        const { error } = await supabase.storage
            .from("trade_screenshots")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type
            });

        if (error) {
            console.error("Upload failed:", error);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from("trade_screenshots")
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    }

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        const userId = localStorage.getItem("zipha_user_id");
        const activeAccount = JSON.parse(localStorage.getItem("active_account"));
        if (!activeAccount) { alert("No active trading account selected."); setLoading(false); return; }
        if (!userId) { alert("User not logged in."); setLoading(false); return; }

        const accountCapital = parseFloat(activeAccount.capital) || 0;
        let entryDate = formData.entryDate;
        let exitDate = formData.exitDate;
        if (formData.duration === "day") { entryDate = formData.date; exitDate = formData.date; }
        const isClosed = formData.status === "closed";

        const tradeInsert = {
            date: formData.date,
            entry_time: formData.entryTime || null,
            exit_time: isClosed ? formData.exitTime || null : null,

            duration: formData.duration,
            entry_date: entryDate,
            exit_date: exitDate,

            asset_type: formData.assetType,
            pair: formData.pair,
            direction: formData.direction,

            entry_price: parseFloat(formData.entryPrice),
            exit_price: isClosed ? parseFloat(formData.exitPrice) : null,

            lot_size: parseFloat(formData.lotSize) || 0,
            stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
            take_profit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,

            stop_loss_pips: formData.stopLossPips ? parseFloat(formData.stopLossPips) : null,
            take_profit_pips: formData.takeProfitPips ? parseFloat(formData.takeProfitPips) : null,

            pips: isClosed ? parseFloat(formData.pips) : null,
            pnl: isClosed ? parseFloat(formData.pnl) : null,

            // Risk & projections
            risk_type: formData.riskType,
            risk_value: parseFloat(formData.riskValue) || null,
            risk_money: parseFloat(formData.riskMoney) || 0,
            projected_pnl_at_tp: parseFloat(formData.projectedPnlAtTP) || 0,
            projected_pnl_at_sl: parseFloat(formData.projectedPnlAtSL) || 0,
            rr: formData.rr || null,

            status: formData.status,
            outcome: isClosed ? formData.outcome : null,

            notes: formData.notes,
            setup: formData.setup,

            user_id: userId,
            capital: accountCapital,
            account_name: activeAccount.account_name,
            account_id: activeAccount.id,
        };

        // Insert
        const { data: inserted, error: insertError } = await supabase
            .from("zipha-tracker")
            .insert(tradeInsert)
            .select()
            .single();

        if (insertError) {
            alert("Error saving trade: " + insertError.message);
            setLoading(false);
            return;
        }

        const tradeId = inserted.id;

        // Upload screenshots
        const beforeUrl = await uploadScreenshot(formData.beforeScreenshot, userId, tradeId, "before");
        const afterUrl = await uploadScreenshot(formData.afterScreenshot, userId, tradeId, "after");

        const { error: updateError } = await supabase
            .from("zipha-tracker")
            .update({ before_screenshot: beforeUrl, after_screenshot: afterUrl })
            .eq("id", tradeId);

        if (updateError) console.error("Error updating trade with screenshot URLs:", updateError);

        setLoading(false);

        if (onSubmit) {
            onSubmit({ ...inserted, before_screenshot: beforeUrl, after_screenshot: afterUrl });
        }

        onClose();
        window.location.reload();
    };

    /* ---------------------------------
        Conditional UI helpers and pair lists
    --------------------------------- */
    const isSwing = formData.duration === "swing";
    const isStatusClosed = formData.status === "closed";

    const PAIR_OPTIONS = {
        Forex: [
            "EUR/USD", "GBP/USD", "USD/JPY", "USD/CAD", "AUD/USD", "NZD/USD",
            "EUR/JPY", "GBP/JPY", "AUD/JPY", "CAD/JPY", "CHF/JPY", "EUR/GBP"
        ],
        Crypto: [
            "BTC/USD", "ETH/USD", "BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT",
            "BNB/USDT", "ADA/USDT"
        ],
        Indices: [
            "US30", "SPX500", "NAS100", "GER40", "UK100", "JP225"
        ],
        Commodity: [
            "XAU/USD", "XAG/USD", "UKOIL", "USOIL", "NGAS"
        ]
    };

    return (
        <div className="trade-form-overlay">
            <div className="trade-form-container">

                {/* HEADER */}
                <div className="form-header">
                    <h2 className="form-title">
                        <TrendingUp className="header-icon" />
                        Add New Trade
                    </h2>

                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* FORM */}
                <div className="trade-form">
               

                    {/* TRADE DETAILS */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <DollarSign size={18} />
                            Trade Details
                        </h3>

                        <div className="form-row">

                            <div className="form-group">
                                <label>Asset Type</label>
                                <select name="assetType" value={formData.assetType} onChange={handleChange}>
                                    <option value="Forex">Forex</option>
                                    <option value="Crypto">Crypto</option>
                                    <option value="Indices">Indices</option>
                                    <option value="Commodity">Commodity</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Trading Pair *</label>
                                <select name="pair" value={formData.pair} onChange={handleChange} className={errors.pair ? 'error' : ''}>
                                    <option value="">Select Pair</option>
                                    {PAIR_OPTIONS[formData.assetType]?.map((pair) => (
                                        <option key={pair} value={pair}>{pair}</option>
                                    ))}
                                </select>
                                {errors.pair && <span className="error-text">{errors.pair}</span>}
                            </div>

                            <div className="form-group">
                                <label>Direction</label>
                                <select name="direction" value={formData.direction} onChange={handleChange}>
                                    <option value="long">Long (Buy)</option>
                                    <option value="short">Short (Sell)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>

                        </div>

                        {/* ENTRY + EXIT PRICE + LOT SIZE */}
                        <div className="form-row">

                            <div className="form-group">
                                <label>Entry Price *</label>
                                <input type="number" step="any" name="entryPrice" value={formData.entryPrice} onChange={handleChange} className={errors.entryPrice ? 'error' : ''} />
                                {errors.entryPrice && <span className="error-text">{errors.entryPrice}</span>}
                            </div>

                            {isStatusClosed && (
                                <div className="form-group">
                                    <label>Exit Price *</label>
                                    <input type="number" step="any" name="exitPrice" value={formData.exitPrice} onChange={handleChange} className={errors.exitPrice ? 'error' : ''} />
                                    {errors.exitPrice && <span className="error-text">{errors.exitPrice}</span>}
                                </div>
                            )}

                        </div>

                        {/* RISK CONTROL */}
                        <div className="form-row">

                            <div className="form-group">
                                <label>Risk Type</label>
                                <select name="riskType" value={formData.riskType} onChange={handleChange}>
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="money">Money ($)</option>
                                    <option value="lot">Lot Size (Manual)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    {formData.riskType === "percentage" && "Risk (%)"}
                                    {formData.riskType === "money" && "Risk ($)"}
                                    {formData.riskType === "lot" && "Lot Size"}
                                </label>
                                <input type="number" step="0.01" name="riskValue" value={formData.riskValue} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>{formData.riskType === "lot" ? "Lot Size *" : "Calculated Lot Size"}</label>
                                <input
                                    type="text"
                                    name="lotSize"
                                    value={formData.lotSize}
                                    onChange={formData.riskType === "lot" ? handleChange : undefined}
                                    readOnly={formData.riskType !== "lot"}
                                    className={formData.riskType !== "lot" ? 'read-only-input' : (errors.lotSize ? 'error' : '')}
                                />
                                {errors.lotSize && <span className="error-text">{errors.lotSize}</span>}
                            </div>

                            <div className="form-group">
                                <label>SL (Pips)</label>
                                <input type="text" name="stopLossPips" value={formData.stopLossPips || ""} readOnly className="read-only-input" />
                            </div>

                            <div className="form-group">
                                <label>Calculated Risk ($)</label>
                                <input type="text" value={formData.riskMoney || "0.00"} readOnly className="read-only-input" />
                            </div>

                        </div>

                        {/* STOP LOSS + TAKE PROFIT */}
                        <div className="form-row">

                            <div className="form-group">
                                <label>Stop Loss</label>
                                <input type="number" step="any" name="stopLoss" value={formData.stopLoss} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>Take Profit</label>
                                <input type="number" step="any" name="takeProfit" value={formData.takeProfit} onChange={handleChange} />
                            </div>

                        </div>

                    </div>

                    {/* RESULTS SECTION */}
                    {isStatusClosed && (
                        <div className="form-section results-section">
                            <h3 className="section-title">
                                {parseFloat(formData.pnl) >= 0 ? (
                                    <TrendingUp size={18} className="text-profit" />
                                ) : (
                                    <TrendingDown size={18} className="text-loss" />
                                )}
                                Trade Results
                            </h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Pips</label>
                                    <input type="text" name="pips" value={formData.pips} readOnly placeholder="Auto-calculated" className="read-only-input" />
                                </div>

                                <div className="form-group">
                                    <label>P&L ($)</label>
                                    <input type="text" name="pnl" value={formData.pnl} readOnly placeholder="Auto-calculated" className={`pnl-input ${parseFloat(formData.pnl) >= 0 ? 'profit' : 'loss'} ${errors.pnl ? 'error' : ''}`} />
                                    {errors.pnl && <span className="error-text">{errors.pnl}</span>}
                                </div>

                            </div>

                     
                        </div>
                    )}


                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                            <Save size={18} />{loading ? "Saving..." : "Save Trade"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

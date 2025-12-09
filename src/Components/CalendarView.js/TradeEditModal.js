import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase'; // Ensure this import path is correct

// Assuming the user ID is stored in localStorage
async function uploadScreenshot(file, userId, tradeId, type) {
    // Crucial check: If the value is an existing public URL (string), skip upload and return the URL.
    if (!file || typeof file === 'string') return file; 

    // If it's a File object (a new upload), proceed.
    const fileExt = file.name.split('.').pop();
    const extension = fileExt || 'png'; 
    // Uses the tradeId to create a unique path for upserting
    const filePath = `${userId}/${tradeId}/${type}.${extension}`;

    const { error } = await supabase.storage
        .from("trade_screenshots")
        .upload(filePath, file, {
            cacheControl: "3600",
            // Use upsert: true to overwrite an existing file with the same path
            upsert: true, 
            contentType: file.type
        });

    if (error) {
        console.error("Upload failed:", error);
        // Optionally, throw an error or return the original URL if upload fails but a previous one existed
        return null; 
    }

    const { data: urlData } = supabase.storage
        .from("trade_screenshots")
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

export default function TradeEditModal({ trade, onClose, onUpdate, theme }) {
    const [formData, setFormData] = useState({
        date: trade.date || new Date().toISOString().split("T")[0],
        entryTime: trade.entry_time || "",
        exitTime: trade.exit_time || "",
        duration: trade.duration || "day",
        entryDate: trade.entry_date || "",
        exitDate: trade.exit_date || "",
        assetType: trade.asset_type || "Forex",
        pair: trade.pair || "",
        direction: trade.direction || "long",
        entryPrice: trade.entry_price || "",
        exitPrice: trade.exit_price || "",
        lotSize: trade.lot_size || "",
        stopLoss: trade.stop_loss || "",
        takeProfit: trade.take_profit || "",
        // pips: trade.pips || "",
        // pnl: trade.pnl || "",
        status: trade.status || "open",
        outcome: trade.outcome || "win",
        notes: trade.notes || "",
        setup: trade.setup || "",
        // Initialize with existing URL strings. These will be replaced by File objects on change.
        beforeScreenshot: trade.before_screenshot || null, 
        afterScreenshot: trade.after_screenshot || null,   
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const isSwing = formData.duration === "swing";
    const isStatusClosed = formData.status === "closed";

    /* --------------------------- AUTO CALCULATIONS --------------------------- */
    useEffect(() => calculatePips(), [formData.entryPrice, formData.exitPrice, formData.pair, formData.direction]);
    useEffect(() => calculatePnL(), [formData.pips, formData.lotSize]);

    const calculatePips = () => {
        const { entryPrice, exitPrice, direction, pair } = formData;
        // Calculation only runs if status is closed and necessary values are present
        if (!entryPrice || !exitPrice || !pair || formData.status === "open") {
            setFormData(prev => ({ ...prev, pips: "" }));
            return;
        }

        const entry = parseFloat(entryPrice);
        const exit = parseFloat(exitPrice);
        const multiplier = pair.includes("JPY") ? 100 : 10000;

        const pipDifference = direction === "long" ? (exit - entry) * multiplier : (entry - exit) * multiplier;
        setFormData(prev => ({ ...prev, pips: pipDifference.toFixed(2) }));
    };

    const calculatePnL = () => {
        const { pips, lotSize } = formData;
        // Calculation only runs if status is closed and necessary values are present
        if (!pips || !lotSize || formData.status === "open") {
            setFormData(prev => ({ ...prev, pnl: "" }));
            return;
        }

        const pipValue = 10;
        const pnl = parseFloat(pips) * pipValue * parseFloat(lotSize);
        setFormData(prev => ({ ...prev, pnl: pnl.toFixed(2) }));
    };

    /* --------------------------- HANDLE INPUT --------------------------- */
    const handleChange = e => {
        const { name, value, files } = e.target;

        if (files && files.length > 0) {
            // Store the actual File object for upload
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            // Handle regular inputs (text, number, select)
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    /* --------------------------- VALIDATION --------------------------- */
    const validate = () => {
        const e = {};
        if (!formData.date) e.date = "Trade date is required";
        if (!formData.pair) e.pair = "Pair is required";
        if (!formData.entryPrice) e.entryPrice = "Entry price required";
        if (!formData.lotSize) e.lotSize = "Lot size required";

        if (formData.status === "closed") {
            if (!formData.exitPrice) e.exitPrice = "Exit price required";
            if (!formData.pnl) e.pnl = "PnL required";
            if (!formData.pips) e.pips = "pips required";
            if (!formData.outcome) e.outcome = "outcome outcome";
            if (!formData.exitTime) e.exitTime = "exit time required";
            if (!formData.exitDate) e.exitTime = "exit date required";
            if (!formData.afterScreenshot) e.DollarSign = "afterScreenshot required"
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* --------------------------- SAVE & UPLOAD --------------------------- */
    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);

        const userId = localStorage.getItem("zipha_user_id"); 
        if (!userId) {
            alert("User not logged in.");
            setLoading(false);
            return;
        }


         const activeAccount = JSON.parse(localStorage.getItem("active_account"));
        if (!activeAccount) {
            alert("No active trading account selected.");
            setLoading(false);
            return;
        }

        // 1. Upload/re-upload screenshots
        const beforeUrl = await uploadScreenshot(
            formData.beforeScreenshot,
            userId,
            trade.id, 
            "before"
        );

        const afterUrl = await uploadScreenshot(
            formData.afterScreenshot,
            userId,
            trade.id,
            "after"
        );
        
        const isClosed = formData.status === "closed";

        // 2. Prepare update object with new data and new/existing URLs
        const updatedTradeData = {
            date: formData.date,
            entry_time: formData.entryTime,
            exit_time: formData.exitTime,
            duration: formData.duration,
            // Determine entry/exit dates based on duration
            entry_date: isSwing ? formData.entryDate : formData.date,
            exit_date: isSwing ? formData.exitDate : formData.date,
            asset_type: formData.assetType,
            pair: formData.pair,
            direction: formData.direction,
            entry_price: parseFloat(formData.entryPrice),
            exit_price: isClosed ? parseFloat(formData.exitPrice) : null,
            lot_size: parseFloat(formData.lotSize),
            stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
            take_profit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
            pips: isClosed ? parseFloat(formData.pips || 0) : 0,
            pnl: isClosed ? parseFloat(formData.pnl || 0) : 0,
            status: formData.status,
            outcome: isClosed ? formData.outcome : null,
            notes: formData.notes,
            setup: formData.setup,
            account_name: activeAccount.account_name,
            account_id: activeAccount.id,

            
            // New or existing URLs from upload step
            before_screenshot: beforeUrl, 
            after_screenshot: afterUrl,
        };

        // 3. Update the trade record in Supabase
        const { data, error } = await supabase
            .from("zipha-tracker")
            .update(updatedTradeData)
            .eq("id", trade.id)
            .select()
            .single();

        if (error) {
            alert("Error updating trade: " + error.message);
        } else {
            // Notify parent component with the updated data (including new URLs)
            onUpdate(data); 
            onClose();
        }

        setLoading(false);
    };

    const PAIR_OPTIONS = {
        Forex: ["EUR/USD","GBP/USD","USD/JPY","USD/CAD","AUD/USD","NZD/USD","EUR/JPY","GBP/JPY","AUD/JPY","CAD/JPY","CHF/JPY","EUR/GBP"],
        Crypto: ["BTC/USD","ETH/USD","BTC/USDT","ETH/USDT","SOL/USDT","XRP/USDT","BNB/USDT","ADA/USDT"],
        Indices: ["US30","SPX500","NAS100","GER40","UK100","JP225"],
        Commodity: ["XAU/USD","XAG/USD","UKOIL","USOIL","NGAS"]
    };

    return (
        <div className={`trade-form-overlay ${theme === 'dark' ? '' : 'light-mode'}`}>
            <div className="trade-form-container">
                <div className="form-header">
                    <h2 className="form-title">
                        <TrendingUp className="header-icon" />
                        Edit Trade (ID: {trade.id})
                    </h2>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="trade-form">
                    
                    {/* 1. Date & Duration */}
                    <div className="form-section">
                        <h3 className="section-title"><Calendar size={18}/> Date & Time</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Trade Date *</label>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} className={errors.date ? 'error' : ''}/>
                                {errors.date && <span className="error-text">{errors.date}</span>}
                            </div>
                            <div className="form-group">
                                <label>Trade Duration</label>
                                <select name="duration" value={formData.duration} onChange={handleChange}>
                                    <option value="day">Day Trade</option>
                                    <option value="swing">Swing Trade</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Entry Time</label>
                                <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange}/>
                            </div>
                            <div className="form-group">
                                <label>Exit Time</label>
                                <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange}/>
                            </div>
                            {isSwing && (
                                <div className="form-group">
                                    <label>Entry Date</label>
                                    <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange}/>
                                </div>
                            )}
                          {isSwing && isStatusClosed && (                
                                <div className="form-group">
                                    <label>Exit Date</label>
                                    <input type="date" name="exitDate" value={formData.exitDate} onChange={handleChange}/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Trade Details */}
                    <div className="form-section">
                        <h3 className="section-title"><DollarSign size={18}/> Trade Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Asset Type</label>
                                <select name="assetType" value={formData.assetType} onChange={handleChange}>
                                    {Object.keys(PAIR_OPTIONS).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Trading Pair *</label>
                                <select name="pair" value={formData.pair} onChange={handleChange} className={errors.pair ? 'error' : ''}>
                                    <option value="">Select Pair</option>
                                    {PAIR_OPTIONS[formData.assetType]?.map(p => <option key={p} value={p}>{p}</option>)}
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

                        <div className="form-row">
                            <div className="form-group">
                                <label>Entry Price($) *</label>
                                <input type="number" step="any" name="entryPrice" value={formData.entryPrice} onChange={handleChange} className={errors.entryPrice ? 'error' : ''}/>
                                {errors.entryPrice && <span className="error-text">{errors.entryPrice}</span>}
                            </div>
                            {isStatusClosed && (
                                <div className="form-group">
                                    <label>Exit Price($) *</label>
                                    <input type="number" step="any" name="exitPrice" value={formData.exitPrice} onChange={handleChange} className={errors.exitPrice ? 'error' : ''}/>
                                    {errors.exitPrice && <span className="error-text">{errors.exitPrice}</span>}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Lot Size *</label>
                                <input type="number" step="0.01" name="lotSize" value={formData.lotSize} onChange={handleChange} className={errors.lotSize ? 'error' : ''}/>
                                {errors.lotSize && <span className="error-text">{errors.lotSize}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Stop Loss</label>
                                <input type="number" step="any" name="stopLoss" value={formData.stopLoss} onChange={handleChange}/>
                            </div>
                            <div className="form-group">
                                <label>Take Profit</label>
                                <input type="number" step="any" name="takeProfit" value={formData.takeProfit} onChange={handleChange}/>
                            </div>
                        </div>
                    </div>

                    {/* 3. Results Section (If Closed) */}
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
                                    <input type="text" name="pips" value={formData.pips} readOnly placeholder="Auto-calculated"/>
                                </div>
                                <div className="form-group">
                                    <label>P&L ($) *</label>
                                    <input type="text" name="pnl" value={formData.pnl} readOnly placeholder="Auto-calculated"/>
                                    {errors.pnl && <span className="error-text">{errors.pnl}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Outcome</label>
                                    <select name="outcome" value={formData.outcome} onChange={handleChange}>
                                        <option value="win">Win</option>
                                        <option value="loss">Loss</option>
                                        <option value="breakeven">Break Even</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Notes & Setup Section */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <AlertCircle size={18} />
                            Analysis & Notes
                        </h3>
                        <div className="form-group full-width">
                            <label>Setup/Pattern</label>
                            <input type="text" name="setup" value={formData.setup} onChange={handleChange} placeholder="e.g., Double Bottom, H&S"/>
                        </div>
                        <div className="form-group full-width">
                            <label>Trade Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder="What happened in this trade? What did you learn?"/>
                        </div>
                    </div>

                    {/* 5. Screenshots Section */}
                    <div className="form-section">
                        <h3 className="section-title">
                             <AlertCircle size={18} />
                            Trade Screenshots
                        </h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Before Trade Screenshot</label>
                                <input type="file" name="beforeScreenshot" accept="image/*" onChange={handleChange} />
                                {/* Display link to current image if it exists and is a URL string */}
                                {formData.beforeScreenshot && typeof formData.beforeScreenshot === 'string' && (
                                    <a href={formData.beforeScreenshot} target="_blank" rel="noopener noreferrer" className="current-image-link">Current Image (Click to View)</a>
                                )}
                            </div>

                            {isStatusClosed && (
                                <div className="form-group">
                                    <label>After Trade Screenshot</label>
                                    <input type="file" name="afterScreenshot" accept="image/*" onChange={handleChange} />
                                     {/* Display link to current image if it exists and is a URL string */}
                                    {formData.afterScreenshot && typeof formData.afterScreenshot === 'string' && (
                                        <a href={formData.afterScreenshot} target="_blank" rel="noopener noreferrer" className="current-image-link">Current Image (Click to View)</a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}>
                            <Save size={18} />
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
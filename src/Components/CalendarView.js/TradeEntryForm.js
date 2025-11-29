import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Save, X } from 'lucide-react';
import { supabase } from '../../supabase';

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

    pips: "",
    pnl: "",

    status: "open",
    outcome: "win",

    notes: "",
    setup: "",

    beforeScreenshot: null,
    afterScreenshot: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ---------------------------
      AUTO CALCULATIONS
  --------------------------- */

  useEffect(() => {
    // Calculates pips whenever price or direction changes
    calculatePips();
  }, [formData.entryPrice, formData.exitPrice, formData.pair, formData.direction]);

  useEffect(() => {
    // Calculates PnL whenever pips or lot size changes
    calculatePnL();
  }, [formData.pips, formData.lotSize]); 


  /* ---------------------------
      HANDLE INPUT CHANGE
  --------------------------- */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };


  /* ---------------------------
      CALCULATE PIPS
  --------------------------- */

  const calculatePips = () => {
    const { entryPrice, exitPrice, direction, pair } = formData;

    // Only calculate if all necessary values are present and status is closed
    if (!entryPrice || !exitPrice || !pair || formData.status === "open") {
      setFormData(prev => ({ ...prev, pips: "" }));
      return;
    }

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);

    // Standard multiplier for Forex (4-digit vs 2-digit pairs)
    let multiplier = pair.includes("JPY") ? 100 : 10000;

    let pipDifference =
      direction === "long"
        ? (exit - entry) * multiplier
        : (entry - exit) * multiplier;

    setFormData(prev => ({
      ...prev,
      pips: pipDifference.toFixed(2)
    }));
  };



  const calculatePnL = () => {
    const { pips, lotSize } = formData; 

    // Only calculate if all necessary values are present and status is closed
    if (!pips || !lotSize || formData.status === "open") {
      setFormData(prev => ({ ...prev, pnl: "" }));
      return;
    }

    const pipValue = 10; // Assuming a standard pip value of $10 per standard lot for calculations
    const lots = parseFloat(lotSize);
    const pipCount = parseFloat(pips);

    const netPnL = pipCount * pipValue * lots; 

    setFormData(prev => ({
      ...prev,
      pnl: netPnL.toFixed(2)
    }));
  };


  /* ---------------------------
      VALIDATION
  --------------------------- */

  const validate = () => {
  const e = {};

  if (!formData.date) e.date = "Trade date is required";
  if (!formData.pair) e.pair = "Pair is required";
  if (!formData.entryPrice) e.entryPrice = "Entry price required";
  if (!formData.lotSize) e.lotSize = "Lot size required";

  // Required fields when CLOSED
  if (formData.status === "closed") {
    if (!formData.exitTime) e.exitTime = "Exit time required";
    if (formData.duration === "swing" && !formData.exitDate)
      e.exitDate = "Exit date required";
    if (!formData.exitPrice) e.exitPrice = "Exit price required";
    if (!formData.pips) e.pips = "Pips required";
    if (!formData.pnl) e.pnl = "PnL required";
    if (!formData.outcome) e.outcome = "Outcome required";
    if (!formData.afterScreenshot)
      e.afterScreenshot = "After-trade screenshot required";
  }

  setErrors(e);
  return Object.keys(e).length === 0;
};



  /* ---------------------------
      FILE UPLOAD LOGIC
  --------------------------- */

  const handleFileChange = (e) => {
    const { name, files } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: files[0]
    }));
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


  /* ---------------------------
      SUBMIT TO SUPABASE
  --------------------------- */

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    // Load user ID
    const userId = localStorage.getItem("zipha_user_id");

    // Load active account
    const activeAccount = JSON.parse(localStorage.getItem("active_account"));
    if (!activeAccount) {
      alert("No active trading account selected.");
      setLoading(false);
      return;
    }
    if (!userId) {
      alert("User not logged in.");
      setLoading(false);
      return;
    }

    // Use the active account's capital instead of the old user capital
    const accountCapital = parseFloat(activeAccount.capital) || 0;

    let entryDate = formData.entryDate;
    let exitDate = formData.exitDate;

    if (formData.duration === "day") {
      entryDate = formData.date;
      exitDate = formData.date;
    }

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

      lot_size: parseFloat(formData.lotSize),
      stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
      take_profit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,

      pips: isClosed ? parseFloat(formData.pips) : null,
      pnl: isClosed ? parseFloat(formData.pnl) : null,

      status: formData.status,
      outcome: isClosed ? formData.outcome : null,

      notes: formData.notes,
      setup: formData.setup,

      // User info
      user_id: userId,
      capital: accountCapital, // Use active account's capital

      // Account linkage
      account_name: activeAccount.account_name,
      account_id: activeAccount.id,
    };


    // 1. Insert trade record to get the trade ID
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

    // 2. Upload screenshots
    const beforeUrl = await uploadScreenshot(
      formData.beforeScreenshot,
      userId,
      tradeId,
      "before"
    );

    const afterUrl = await uploadScreenshot(
      formData.afterScreenshot,
      userId,
      tradeId,
      "after"
    );

    // 3. Update the trade record with the screenshot URLs
    const { error: updateError } = await supabase
      .from("zipha-tracker")
      .update({
        before_screenshot: beforeUrl,
        after_screenshot: afterUrl
      })
      .eq("id", tradeId);

    if (updateError) {
      console.error("Error updating trade with screenshot URLs:", updateError);
    }

    setLoading(false);
    
    // Notify the parent component and close the form
    if (onSubmit) {
        onSubmit({
            ...inserted,
            before_screenshot: beforeUrl,
            after_screenshot: afterUrl
        });
    }

    onClose();
    // Refresh the page to show the new trade
    window.location.reload(); 
  };


  /* ---------------------------------
      CONDITIONAL RULES
  --------------------------------- */

  const isSwing = formData.duration === "swing";
  const isStatusClosed = formData.status === "closed";


  /* Asset Type → Trading Pairs */
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


  /* ---------------------------------
      UI RENDER
  --------------------------------- */

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

          {/* DATE SECTION */}
          <div className="form-section">
            <h3 className="section-title">
              <Calendar size={18} />
              Date & Time
            </h3>

            <div className="form-row">

              {/* Trade Date */}
              <div className="form-group">
                <label>Trade Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className={errors.date ? 'error' : ''} />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>

              {/* Duration */}
              <div className="form-group">
                <label>Trade Duration</label>
                <select name="duration" value={formData.duration} onChange={handleChange}>
                  <option value="day">Day Trade</option>
                  <option value="swing">Swing Trade</option>
                </select>
              </div>

              {/* ENTRY TIME */}

              <div className="form-group">
                <label>Entry Time</label>
                <input
                  type="time"
                  name="entryTime"
                  value={formData.entryTime}
                  onChange={handleChange}
                />
              </div>
              

              {/* EXIT TIME */}
              {isStatusClosed && (

                <div className="form-group">
                  <label>Exit Time</label>
                  <input
                    type="time"
                    name="exitTime"
                    value={formData.exitTime}
                    onChange={handleChange}
                  />
                </div>
              )}

              {/* Entry Date (Swing Only) */}
              {isSwing && (
                <div className="form-group">
                  <label>Entry Date</label>
                  <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} />
                </div>
              )}

              {/* Exit Date (Swing Only) */}
              {isSwing && isStatusClosed && (                
                <div className="form-group">
                  <label>Exit Date</label>
                  <input type="date" name="exitDate" value={formData.exitDate} onChange={handleChange} />
                </div>
            )}
            </div>
          </div>

          

          {/* TRADE DETAILS */}
          <div className="form-section">
            <h3 className="section-title">
              <DollarSign size={18} />
              Trade Details
            </h3>

            <div className="form-row">

              {/* Asset Type */}
              <div className="form-group">
                <label>Asset Type</label>
                <select
                  name="assetType"
                  value={formData.assetType}
                  onChange={handleChange}
                >
                  <option value="Forex">Forex</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Indices">Indices</option>
                  <option value="Commodity">Commodity</option>
                </select>
              </div>

              {/* Pair */}
              <div className="form-group">
                <label>Trading Pair *</label>
                <select
                  name="pair"
                  value={formData.pair}
                  onChange={handleChange}
                  className={errors.pair ? 'error' : ''}
                >
                  <option value="">Select Pair</option>

                  {PAIR_OPTIONS[formData.assetType]?.map((pair) => (
                    <option key={pair} value={pair}>
                      {pair}
                    </option>
                  ))}
                </select>
                {errors.pair && <span className="error-text">{errors.pair}</span>}
              </div>


              {/* Direction */}
              <div className="form-group">
                <label>Direction</label>
                <select name="direction" value={formData.direction} onChange={handleChange}>
                  <option value="long">Long (Buy)</option>
                  <option value="short">Short (Sell)</option>
                </select>
              </div>

              {/* Status */}
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
                <label>Entry Price($) *</label>
                <input
                  type="number"
                  step="any"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleChange}
                  className={errors.entryPrice ? 'error' : ''}
                />
                {errors.entryPrice && <span className="error-text">{errors.entryPrice}</span>}
              </div>

              {isStatusClosed && (
                <div className="form-group">
                  <label>Exit Price($) *</label>
                  <input
                    type="number"
                    step="any"
                    name="exitPrice"
                    value={formData.exitPrice}
                    onChange={handleChange}
                    className={errors.exitPrice ? 'error' : ''}
                  />
                  {errors.exitPrice && <span className="error-text">{errors.exitPrice}</span>}
                </div>
              )}

              <div className="form-group">
                <label>Lot Size *</label>
                <input
                  type="number"
                  step="0.01"
                  name="lotSize"
                  value={formData.lotSize}
                  onChange={handleChange}
                  className={errors.lotSize ? 'error' : ''}
                />
                {errors.lotSize && <span className="error-text">{errors.lotSize}</span>}
              </div>
            </div>

            {/* STOP LOSS + TAKE PROFIT */}
            <div className="form-row">

              <div className="form-group">
                <label>Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  name="stopLoss"
                  value={formData.stopLoss}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Take Profit</label>
                <input
                  type="number"
                  step="any"
                  name="takeProfit"
                  value={formData.takeProfit}
                  onChange={handleChange}
                />
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
                  <input
                    type="text"
                    name="pips"
                    value={formData.pips}
                    readOnly
                    placeholder="Auto-calculated"
                  />
                </div>

                <div className="form-group">
                  <label>P&L ($) *</label>
                  <input
                    type="text"
                    name="pnl"
                    value={formData.pnl}
                    readOnly
                    placeholder="Auto-calculated"
                    className={`pnl-input ${parseFloat(formData.pnl) >= 0 ? 'profit' : 'loss'} ${errors.pnl ? 'error' : ''}`}
                  />
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

          

          {/* NOTES & SETUP SECTION */}
          <div className="form-section">
            <h3 className="section-title">
              <AlertCircle size={18} />
              Analysis & Notes
            </h3>

            <div className="form-group full-width">
              <label>Setup/Pattern</label>
              <input
                type="text"
                name="setup"
                value={formData.setup}
                onChange={handleChange}
                placeholder="e.g., Double Bottom, H&S"
              />
            </div>

            <div className="form-group full-width">
              <label>Trade Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                placeholder="What happened in this trade? What did you learn?"
              />
            </div>
          </div>

          

          {/* SCREENSHOTS SECTION */}
          <div className="form-section">
            <h3 className="section-title">
              <AlertCircle size={18} />
              Trade Screenshots
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label>Before Trade Screenshot</label>
                <input type="file" name="beforeScreenshot" accept="image/*" onChange={handleFileChange} />
              </div>

              {isStatusClosed && (

                <div className="form-group">
                  <label>After Trade Screenshot</label>
                  <input type="file" name="afterScreenshot" accept="image/*" onChange={handleFileChange} />
                </div>
              )}

            </div>
          </div>

          
          
          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              <Save size={18} />
              {loading ? "Saving..." : "Save Trade"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Save, X } from 'lucide-react';
import { supabase } from '../../supabase';

/*
 * Full fixed file:
 * - lotSize is readOnly and always auto-updated from riskValue + riskType + stopLoss + account capital
 * - riskValue input is the single editable risk control (percentage | money | lot)
 * - robust safe parsing and avoids unnecessary state updates
 * - pips, projected PnL, and realized PnL update automatically
*/

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

  "XAU/USD": { pipSize: 0.01, contractSize: 100, quoteCurrency: "USD", assetType: "Commodity" },
  "XAG/USD": { pipSize: 0.01, contractSize: 5000, quoteCurrency: "USD", assetType: "Commodity" },

  "US30": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
  "NAS100": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
  "SPX500": { pipSize: 0.1, contractSize: 1, quoteCurrency: "USD", assetType: "Indices" },
  "GER40": { pipSize: 1.0, contractSize: 1, quoteCurrency: "EUR", assetType: "Indices" },

  "BTC/USD": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Crypto" },
  "ETH/USD": { pipSize: 1.0, contractSize: 1, quoteCurrency: "USD", assetType: "Crypto" },
};

const EXCHANGE_RATES_TO_USD = {
  USD: 1.0,
  JPY: 1 / 150.0,
  CAD: 1 / 1.35,
  EUR: 1.08,
  GBP: 1.25,
  CHF: 1 / 0.88,
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
    lotSize: "", // read-only UI field (calculated)
    stopLoss: "",
    takeProfit: "",

    // Calculated
    stopLossPips: "",
    takeProfitPips: "",
    pips: "",
    pnl: "",

    // Risk fields
    riskType: "percentage", // percentage | money | lot
    riskValue: 1, // single editable input (value meaning depends on riskType)
    riskMoney: "0.00", // calculated $
    projectedPnlAtTP: "0.00",
    projectedPnlAtSL: "0.00",
    rr: "",

    status: "open",
    outcome: "win",

    notes: "",
    setup: "",

    beforeScreenshot: null,
    afterScreenshot: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // small helper to avoid unnecessary state updates (prevents effect loops)
  const setFieldIfChanged = (key, value) => {
    setFormData(prev => {
      const old = prev[key];
      // normalize to string for consistent comparison (UI stores strings)
      const oldStr = old === undefined || old === null ? "" : String(old);
      const newStr = value === undefined || value === null ? "" : String(value);
      if (oldStr === newStr) return prev;
      return { ...prev, [key]: value };
    });
  };

  const safeParse = (v) => {
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
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

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] || null }));
  };

  /* ---------------------------
    1) Calculate SL & TP (pips) whenever entry/SL/TP/pair change
  --------------------------- */
  useEffect(() => {
    const { entryPrice, stopLoss, takeProfit, pair } = formData;

    if (!pair || !entryPrice) {
      setFieldIfChanged("stopLossPips", "");
      setFieldIfChanged("takeProfitPips", "");
      return;
    }

    const specs = PIP_SPECIFICATIONS[pair];
    if (!specs) {
      setFieldIfChanged("stopLossPips", "");
      setFieldIfChanged("takeProfitPips", "");
      return;
    }

    const entry = safeParse(entryPrice);
    const sl = safeParse(stopLoss);
    const tp = safeParse(takeProfit);
    const pipMultiplier = 1 / specs.pipSize;

    if (entry && sl) {
      const slPips = Math.abs(entry - sl) * pipMultiplier;
      setFieldIfChanged("stopLossPips", round(slPips, 2).toFixed(2));
    } else {
      setFieldIfChanged("stopLossPips", "");
    }

    if (entry && tp) {
      const tpPips = Math.abs(tp - entry) * pipMultiplier;
      setFieldIfChanged("takeProfitPips", round(tpPips, 2).toFixed(2));
    } else {
      setFieldIfChanged("takeProfitPips", "");
    }
  // intentionally depend on these form fields only
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.pair]);

  /* ---------------------------
    2) Unified risk -> lot calculation
    - The UI risk input is `riskValue`.
    - If riskType === "lot", riskValue is the lot count.
    - The calculated lot is written into `lotSize` (string) and is READ-ONLY in UI.
  --------------------------- */
  useEffect(() => {
    const specs = formData.pair ? PIP_SPECIFICATIONS[formData.pair] : null;
    const stopLossPips = safeParse(formData.stopLossPips);
    const riskValueRaw = safeParse(formData.riskValue);

    // if we don't have necessary data, clear lot and riskMoney
    if (!specs || stopLossPips <= 0 || !formData.pair) {
      setFieldIfChanged("lotSize", "");
      setFieldIfChanged("riskMoney", "0.00");
      return;
    }

    // get account capital from localStorage (if percentage mode)
    const account = (() => {
      try {
        return JSON.parse(localStorage.getItem("active_account"));
      } catch (e) {
        return null;
      }
    })();
    const capital = account ? safeParse(account.capital) : 0;

    // pip value ($) per lot (convert quote currency to USD)
    const conv = EXCHANGE_RATES_TO_USD[specs.quoteCurrency] || 1.0;
    const pipValueUsdPerLot = specs.contractSize * specs.pipSize * conv; // $ per pip per 1 lot
    const riskPerLotUsd = pipValueUsdPerLot * stopLossPips; // $ risk per 1 lot at SL distance

    let lotSizeNumeric = 0;
    let riskMoney = 0;

    if (formData.riskType === "percentage") {
      // require capital > 0 else can't calculate percent
      if (capital <= 0) {
        setFieldIfChanged("lotSize", "");
        setFieldIfChanged("riskMoney", "0.00");
        return;
      }
      riskMoney = (capital * riskValueRaw) / 100; // $ amount to risk
      lotSizeNumeric = riskPerLotUsd > 0 ? (riskMoney / riskPerLotUsd) : 0;
    } else if (formData.riskType === "money") {
      riskMoney = riskValueRaw;
      
      // ✅ FIX APPLIED HERE: Only calculate lot if the risk money is positive.
      if (riskMoney > 0) {
        lotSizeNumeric = riskPerLotUsd > 0 ? (riskMoney / riskPerLotUsd) : 0;
      } else {
        lotSizeNumeric = 0;
      }
      
    } else if (formData.riskType === "lot") {
      // Here the user typed lot amount into riskValue; we display it in lotSize
      lotSizeNumeric = riskValueRaw;
      riskMoney = lotSizeNumeric * riskPerLotUsd;
    }

    lotSizeNumeric = Math.max(0, lotSizeNumeric);
    riskMoney = Math.max(0, riskMoney);

    // store formatted strings in formData only if changed (avoid loops)
    // If lotSizeNumeric is 0 (due to lack of entry/risk), set lotStr to empty string
    const lotStr = lotSizeNumeric ? round(lotSizeNumeric, 2).toFixed(2) : "";
    const riskMoneyStr = round(riskMoney, 2).toFixed(2);

    setFieldIfChanged("lotSize", lotStr);
    setFieldIfChanged("riskMoney", riskMoneyStr);
  }, [formData.riskType, formData.riskValue, formData.stopLossPips, formData.pair]);

  /* ---------------------------
    3) realized pips calculation (entry/exit/direction/pair)
  --------------------------- */
  useEffect(() => {
    const { entryPrice, exitPrice, direction, pair } = formData;

    if (!entryPrice || !exitPrice || !pair) {
      setFieldIfChanged("pips", "");
      return;
    }

    const specs = PIP_SPECIFICATIONS[pair];
    if (!specs) {
      setFieldIfChanged("pips", "");
      return;
    }

    const entry = safeParse(entryPrice);
    const exit = safeParse(exitPrice);
    const pipMultiplier = 1 / specs.pipSize;

    let pipDifference =
      direction === "long"
        ? (exit - entry) * pipMultiplier
        : (entry - exit) * pipMultiplier;

    if (Math.abs(pipDifference) < 0.000001) pipDifference = 0;
    setFieldIfChanged("pips", round(pipDifference, 2).toFixed(2));
  }, [formData.entryPrice, formData.exitPrice, formData.direction, formData.pair]);

  /* ---------------------------
    4) PnL + projections
    - uses the calculated lotSize (from formData.lotSize)
  --------------------------- */
  const calculatePnLAndProjections = () => {
    const specs = formData.pair ? PIP_SPECIFICATIONS[formData.pair] : null;
    if (!specs) {
      setFieldIfChanged("pnl", "");
      setFieldIfChanged("projectedPnlAtTP", "0.00");
      setFieldIfChanged("projectedPnlAtSL", "0.00");
      setFieldIfChanged("rr", "");
      return;
    }

    const pipCount = safeParse(formData.pips);
    const slPips = safeParse(formData.stopLossPips);
    const tpPips = safeParse(formData.takeProfitPips);
    const lots = safeParse(formData.lotSize);

    const conv = EXCHANGE_RATES_TO_USD[specs.quoteCurrency] || 1.0;
    const pipValueUsdPerLot = specs.contractSize * specs.pipSize * conv;

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

    setFieldIfChanged("pnl", round(netPnL, 2).toFixed(2));
    setFieldIfChanged("projectedPnlAtTP", round(projectedAtTP, 2).toFixed(2));
    setFieldIfChanged("projectedPnlAtSL", round(projectedAtSL, 2).toFixed(2));
    setFieldIfChanged("rr", rr);
  };

  useEffect(() => {
    calculatePnLAndProjections();
    // depend on relevant values
  }, [formData.pips, formData.lotSize, formData.pair, formData.status, formData.takeProfitPips, formData.stopLossPips]);

  /* ---------------------------
    Validation, upload, submit (kept your original logic)
  --------------------------- */
  const validate = () => {
    const e = {};
    if (!formData.date) e.date = "Trade date is required";
    if (!formData.pair) e.pair = "Pair is required";
    if (!formData.entryPrice) e.entryPrice = "Entry price required";
    if (formData.riskType === "lot" && !formData.riskValue) e.riskValue = "Lot value required";

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

    // Persist lot_size numeric from formData.lotSize
    const lotToSave = parseFloat(formData.lotSize) || 0;

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

      lot_size: lotToSave,
      stop_loss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
      take_profit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,

    //   stop_loss_pips: formData.stopLossPips ? parseFloat(formData.stopLossPips) : null, // Should be calculated on backend or stored
    //   take_profit_pips: formData.takeProfitPips ? parseFloat(formData.takeProfitPips) : null, // Should be calculated on backend or stored

    //   pips: isClosed ? parseFloat(formData.pips) : null, // Should be calculated on backend or stored
    //   pnl: isClosed ? parseFloat(formData.pnl) : null, // Should be calculated on backend or stored

      // Risk & projections
    //   risk_type: formData.riskType, // Should be stored
    //   risk_value: parseFloat(formData.riskValue) || null, // Should be stored
    //   risk_money: parseFloat(formData.riskMoney) || 0, // Should be stored

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

          {/* DATE SECTION */}
          <div className="form-section">
            <h3 className="section-title">
              <Calendar size={18} />
              Date & Time
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Trade Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className={errors.date ? 'error' : ''} />
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
                <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} />
              </div>

              {isStatusClosed && (
                <div className="form-group">
                  <label>Exit Time</label>
                  <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange} />
                </div>
              )}

              {isSwing && (
                <div className="form-group">
                  <label>Entry Date</label>
                  <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} />
                </div>
              )}

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
                <label>Stop Loss</label>
                <input type="number" step="any" name="stopLoss" value={formData.stopLoss} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Take Profit</label>
                <input type="number" step="any" name="takeProfit" value={formData.takeProfit} onChange={handleChange} />
              </div>

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
                <label>Calculated Lot Size</label>
                <input
                  type="text"
                  name="lotSize"
                  value={formData.lotSize}
                  readOnly
                  className="read-only-input"
                />
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

                <div className="form-group">
                  <label>Outcome</label>
                  <select name="outcome" value={formData.outcome} onChange={handleChange}>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Break Even</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Projected P&L at TP ($)</label>
                  <input type="text" value={formData.projectedPnlAtTP} readOnly className="read-only-input" />
                </div>
                <div className="form-group">
                  <label>Projected P&L at SL ($)</label>
                  <input type="text" value={formData.projectedPnlAtSL} readOnly className="read-only-input" />
                </div>
                <div className="form-group">
                  <label>RR (TP/SL)</label>
                  <input type="text" value={formData.rr} readOnly className="read-only-input" />
                </div>
              </div>
            </div>
          )}

          {/* NOTES & SETUP */}
          <div className="form-section">
            <h3 className="section-title">
              <AlertCircle size={18} />
              Analysis & Notes
            </h3>

            <div className="form-group full-width">
              <label>Setup/Pattern</label>
              <input type="text" name="setup" value={formData.setup} onChange={handleChange} placeholder="e.g., Double Bottom, H&S" />
            </div>
            <br />

            <div className="form-group full-width">
              <label>Trade Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" placeholder="What happened in this trade? What did you learn?" />
            </div>
          </div>

          {/* SCREENSHOTS */}
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
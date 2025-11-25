import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, AlertCircle, Save, X } from 'lucide-react';

export default function TradeEntryForm({ onSubmit, onClose, initialDate = null }) {
  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
    entryTime: '',
    exitTime: '',
    pair: '',
    direction: 'long',
    entryPrice: '',
    exitPrice: '',
    lotSize: '',
    stopLoss: '',
    takeProfit: '',
    pnl: '',
    pips: '',
    commission: '',
    notes: '',
    strategy: '',
    setup: '',
    outcome: 'win'
  });

  const [errors, setErrors] = useState({});

  const currencyPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
    'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'Other'
  ];

  const strategies = [
    'Breakout', 'Trend Following', 'Support/Resistance', 'Moving Average',
    'Fibonacci', 'Supply/Demand', 'Price Action', 'News Trading', 'Scalping', 'Other'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const calculatePips = () => {
    const { entryPrice, exitPrice, direction, pair } = formData;
    
    if (!entryPrice || !exitPrice) return;
    
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    
    let pipDifference;
    
    const isJPYPair = pair.includes('JPY');
    const multiplier = isJPYPair ? 100 : 10000;
    
    if (direction === 'long') {
      pipDifference = (exit - entry) * multiplier;
    } else {
      pipDifference = (entry - exit) * multiplier;
    }
    
    setFormData(prev => ({
      ...prev,
      pips: pipDifference.toFixed(2)
    }));
  };

  const calculatePnL = () => {
    const { pips, lotSize, commission } = formData;
    
    if (!pips || !lotSize) return;
    
    const pipValue = 10;
    const lots = parseFloat(lotSize);
    const pipCount = parseFloat(pips);
    const comm = parseFloat(commission) || 0;
    
    const grossPnL = pipCount * pipValue * lots;
    const netPnL = grossPnL - comm;
    
    setFormData(prev => ({
      ...prev,
      pnl: netPnL.toFixed(2)
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.pair) newErrors.pair = 'Currency pair is required';
    if (!formData.entryPrice) newErrors.entryPrice = 'Entry price is required';
    if (!formData.exitPrice) newErrors.exitPrice = 'Exit price is required';
    if (!formData.lotSize) newErrors.lotSize = 'Lot size is required';
    if (!formData.pnl) newErrors.pnl = 'P&L is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }
    
    const tradeData = {
      ...formData,
      pnl: parseFloat(formData.pnl),
      pips: parseFloat(formData.pips || 0),
      lotSize: parseFloat(formData.lotSize),
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: parseFloat(formData.exitPrice),
      stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
      takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
      commission: formData.commission ? parseFloat(formData.commission) : 0,
      isLoss: parseFloat(formData.pnl) < 0,
      winRate: parseFloat(formData.pnl) > 0 ? 100 : 0
    };
    
    onSubmit(tradeData);
  };

  return (
    <div className="trade-form-overlay">
      <div className="trade-form-container">
        <div className="form-header">
          <h2 className="form-title">
            <TrendingUp className="header-icon" />
            Add New Trade
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="trade-form">
          {/* Date & Time Section */}
          <div className="form-section">
            <h3 className="section-title">
              <Calendar size={18} />
              Date & Time
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Trade Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={errors.date ? 'error' : ''}
                />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="entryTime">Entry Time</label>
                <input
                  type="time"
                  id="entryTime"
                  name="entryTime"
                  value={formData.entryTime}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="exitTime">Exit Time</label>
                <input
                  type="time"
                  id="exitTime"
                  name="exitTime"
                  value={formData.exitTime}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Trade Details Section */}
          <div className="form-section">
            <h3 className="section-title">
              <DollarSign size={18} />
              Trade Details
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pair">Currency Pair *</label>
                <select
                  id="pair"
                  name="pair"
                  value={formData.pair}
                  onChange={handleChange}
                  className={errors.pair ? 'error' : ''}
                >
                  <option value="">Select pair...</option>
                  {currencyPairs.map(pair => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
                {errors.pair && <span className="error-text">{errors.pair}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="direction">Direction</label>
                <select
                  id="direction"
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                >
                  <option value="long">Long (Buy)</option>
                  <option value="short">Short (Sell)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="lotSize">Lot Size *</label>
                <input
                  type="number"
                  step="0.01"
                  id="lotSize"
                  name="lotSize"
                  value={formData.lotSize}
                  onChange={handleChange}
                  placeholder="0.10"
                  className={errors.lotSize ? 'error' : ''}
                />
                {errors.lotSize && <span className="error-text">{errors.lotSize}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="entryPrice">Entry Price *</label>
                <input
                  type="number"
                  step="0.00001"
                  id="entryPrice"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleChange}
                  onBlur={calculatePips}
                  placeholder="1.08500"
                  className={errors.entryPrice ? 'error' : ''}
                />
                {errors.entryPrice && <span className="error-text">{errors.entryPrice}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="exitPrice">Exit Price *</label>
                <input
                  type="number"
                  step="0.00001"
                  id="exitPrice"
                  name="exitPrice"
                  value={formData.exitPrice}
                  onChange={handleChange}
                  onBlur={calculatePips}
                  placeholder="1.08650"
                  className={errors.exitPrice ? 'error' : ''}
                />
                {errors.exitPrice && <span className="error-text">{errors.exitPrice}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="pips">Pips</label>
                <input
                  type="number"
                  step="0.01"
                  id="pips"
                  name="pips"
                  value={formData.pips}
                  onChange={handleChange}
                  onBlur={calculatePnL}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stopLoss">Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  id="stopLoss"
                  name="stopLoss"
                  value={formData.stopLoss}
                  onChange={handleChange}
                  placeholder="1.08200"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="takeProfit">Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  id="takeProfit"
                  name="takeProfit"
                  value={formData.takeProfit}
                  onChange={handleChange}
                  placeholder="1.09000"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="commission">Commission/Swap</label>
                <input
                  type="number"
                  step="0.01"
                  id="commission"
                  name="commission"
                  value={formData.commission}
                  onChange={handleChange}
                  placeholder="5.00"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
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
                <label htmlFor="pnl">P&L ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  id="pnl"
                  name="pnl"
                  value={formData.pnl}
                  onChange={handleChange}
                  placeholder="Auto-calculated"
                  className={`pnl-input ${parseFloat(formData.pnl) >= 0 ? 'profit' : 'loss'} ${errors.pnl ? 'error' : ''}`}
                />
                {errors.pnl && <span className="error-text">{errors.pnl}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="outcome">Outcome</label>
                <select
                  id="outcome"
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                >
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="breakeven">Break Even</option>
                </select>
              </div>
            </div>
          </div>

          {/* Strategy & Notes Section */}
          <div className="form-section">
            <h3 className="section-title">
              <AlertCircle size={18} />
              Strategy & Notes
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="strategy">Strategy</label>
                <select
                  id="strategy"
                  name="strategy"
                  value={formData.strategy}
                  onChange={handleChange}
                >
                  <option value="">Select strategy...</option>
                  {strategies.map(strat => (
                    <option key={strat} value={strat}>{strat}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="setup">Setup/Pattern</label>
                <input
                  type="text"
                  id="setup"
                  name="setup"
                  value={formData.setup}
                  onChange={handleChange}
                  placeholder="e.g., Double Bottom, H&S"
                />
              </div>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="notes">Trade Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                placeholder="What happened in this trade? What did you learn?"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              <Save size={18} />
              Save Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
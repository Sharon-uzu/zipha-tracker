import React, { useState } from 'react';
import { BsPencil, BsTrash } from 'react-icons/bs';
import { supabase } from "../../supabase"; 

const TradeDetailModal = ({ trade, onClose, onUpdate, onDelete, theme }) => {
    // Basic state for editing the trade, e.g., trade notes
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(trade.notes || "");
    const [loading, setLoading] = useState(false);

    const beforeTradeUrl = trade.before_screenshot || 'https://via.placeholder.com/250x180?text=Before+Trade';
    const afterTradeUrl = trade.after_screenshot || 'https://via.placeholder.com/250x180?text=After+Trade';

    // NOTE: In a real app, you would handle image uploads/storage here.

    // ... (handleSave and handleDelete logic remain the same) ...

    const handleSave = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('zipha-tracker')
            .update({ notes: notes })
            .eq('id', trade.id)
            .select() 
            .single();

        setLoading(false);
        if (error) {
            console.error("Error updating trade:", error);
            alert("Failed to save notes.");
        } else {
            onUpdate({ ...trade, notes: notes });
            setIsEditing(false);
        }
    };

   const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this trade?")) return;

    setLoading(true);

    const { error } = await supabase
        .from('zipha-tracker')
        .delete()
        .eq('id', trade.id);

    setLoading(false);

    if (error) {
        console.error("Error deleting trade:", error);
        alert("Failed to delete trade.");
        return;
    }

    if (typeof onDelete === "function") {
        onDelete(trade.id);
    } else {
        console.warn("onDelete was not provided to TradeDetailModal");
    }
};

    
    // Helper to format currency
    const formatCurrency = (value) => {
        return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `+$${value.toFixed(2)}`;
    };

    // Helper to determine P&L class
    const pnlClass = Number(trade.pnl) >= 0 ? 'pnl-profit' : 'pnl-loss';
    
    // Use the trade.asset_type field for the top right 'FOREX' or 'CRYPTO' tag
    const assetTag = trade.asset_type || 'FOREX'; 

    return (
        <div className="modal-backdrop" onClick={onClose}>
            {/* The main modal container */}
            <div className={`trade-modal ${theme === 'light' ? 'light-mode' : ''}`} onClick={e => e.stopPropagation()}>
                <div className='trade-content'>
                    {/* Custom Header Area (Replicates the EURUSD | FOREX | Delete | X structure) */}
                    <div className="trade-title-bar">
                        <h3 className="trade-asset-title">
                            {/* Assuming 'pair' is used for the currency pair */}
                            **{trade.pair || 'EURUSD'}** <span className="asset-tag">{assetTag.toUpperCase()}</span>
                        </h3>
                        <div className="header-actions">
                            <button className="delete-btn-header" onClick={handleDelete} disabled={loading}>
                                <BsTrash size={12} /> Delete
                            </button>
                            <button className="close-btn-header" onClick={onClose}>&times;</button>
                        </div>
                    </div>
                    
                    {/* Main Content Grid */}
                    <div className="modal-content-grid">
                        
                        {/* Left Panel: Trade Information, Price Levels, Trade Notes */}
                        <div className="trade-info-panel">
                            
                            {/* 1. Trade Information Section */}
                            <div className="section-block">
                                <h4 className="section-title">Trade Information</h4>
                                <div className="info-row">
                                    <span className="label">Date</span>
                                    <span className="value">{trade.date || 'Aug 18, 2025'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Type</span>
                                    {/* Use a styled span for the LONG/SHORT label */}
                                    <span className={`type-tag ${trade.direction || 'LONG'}`}>{trade.direction || 'LONG'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Size</span>
                                    <span className="value">{trade.lot_size || '6 lots'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Status</span>
                                    <span className="value">Closed</span>
                                </div>
                            </div>

                            {/* 2. Price Levels & P&L Section */}
                            <div className="section-block">
                                <h4 className="section-title">Price Levels</h4>
                                <div className="info-row">
                                    <span className="label">Entry Price</span>
                                    <span className="value">{trade.entry_price || '1.14000'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Exit Price</span>
                                    <span className="value">{trade.exit_price || '1.15000'}</span>
                                </div>
                                <div className="info-row pnl-row">
                                    <span className="label">P&L</span>
                                    <span className={`value pnl-value ${pnlClass}`}>{formatCurrency(Number(trade.pnl || 6000.00))}</span>
                                </div>
                            </div>
                            
                            {/* 3. Trade Notes Section (Simplified to match screenshot) */}
                            <div className="section-block trade-notes-section">
                                <h4 className="section-title">Trade Notes</h4>
                                <div className="notes-content">
                                    {isEditing ? (
                                        <textarea
                                            id="trade-notes"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows="6"
                                            disabled={loading}
                                        />
                                    ) : (
                                        <p className="notes-display">{notes || "No notes added."}</p>
                                    )}
                                </div>
                                <div className="notes-actions">
                                    {isEditing ? (
                                        <button className="save-btn" onClick={handleSave} disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Notes'}
                                        </button>
                                    ) : (
                                        <button className="edit-btn" onClick={() => setIsEditing(true)}>
                                            <BsPencil size={12} /> Edit Notes
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Panel: Trade Screenshots */}
                        <div className="trade-images-panel">
                            <h4 className="section-title">Trade Screenshots</h4>
                            <div className="image-card">
                                <h5>Before Trade</h5>
                                <img src={beforeTradeUrl} alt="Chart before trade" />
                            </div>
                            <div className="image-card">
                                <h5>After Trade</h5>
                                <img src={afterTradeUrl} alt="Chart after trade" />
                            </div>
                        </div>
                        
                    </div>
                    
                    {/* Footer Action (Close button) */}
                    <div className="modal-footer">
                        <button className="close-btn-footer" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeDetailModal;
import React from 'react';
import './PriceChangeFilter.css';

const PriceChangeFilter = ({ checked, onChange }) => {
    return (
        <div className="price-change-filter">
            <label className="price-change-toggle">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Show only tires with price changes</span>
            </label>
        </div>
    );
};

export default PriceChangeFilter;
import React from 'react';
import './TodayChangeFilter.css';

const TodayChangeFilter = ({ checked, onChange }) => {
    return (
        <div className="today-change-filter">
            <label className="today-change-toggle">
                <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={(e) => onChange(e.target.checked)} 
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Show only tires with price changes today</span>
            </label>
        </div>
    );
};

export default TodayChangeFilter;
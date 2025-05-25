import React from 'react';
import './ActionButtons.css';

const ActionButtons = ({ onAddToDatabase, onExportToCsv, disabled }) => {
    return (
        <div className="action-buttons">
            <button
                className="action-button database-button"
                onClick={onAddToDatabase}
                disabled={disabled}
            >
                Add to Database
            </button>

            <button
                className="action-button csv-button"
                onClick={onExportToCsv}
                disabled={disabled}
            >
                Export to CSV
            </button>
        </div>
    );
};

export default ActionButtons;
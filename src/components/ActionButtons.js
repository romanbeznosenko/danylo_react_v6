// components/ActionButtons.js - Updated with role-based visibility
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ActionButtons.css';

const ActionButtons = ({ onAddToDatabase, onExportToCsv, disabled }) => {
    const { canAccessDatabase } = useAuth();

    return (
        <div className="action-buttons">
            {canAccessDatabase() && (
                <button
                    className="action-button database-button"
                    onClick={onAddToDatabase}
                    disabled={disabled}
                >
                    Add to Database
                </button>
            )}

            <button
                className="action-button csv-button"
                onClick={onExportToCsv}
                disabled={disabled}
            >
                Export to CSV
            </button>

            {!canAccessDatabase() && (
                <div className="guest-notice">
                    <small>💡 As a guest, you can scrape and export data, but cannot save to database. Upgrade to User role for database access.</small>
                </div>
            )}
        </div>
    );
};

export default ActionButtons;
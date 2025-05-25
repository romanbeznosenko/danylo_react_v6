import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ message, onRetry }) => {
    return (
        <div className="error-container">
            <div className="error-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div className="error-content">
                <h3>Something went wrong</h3>
                <p>{message || 'An error occurred. Please try again later.'}</p>
                {onRetry && (
                    <button className="retry-button" onClick={onRetry}>
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorMessage;
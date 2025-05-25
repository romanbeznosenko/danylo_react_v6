import React, { useState, useEffect } from 'react';
import { fetchTirePriceHistory } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './TireDetailModal.css';

const TireDetailModal = ({ tire, onClose }) => {
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPriceHistory = async () => {
            if (!tire || !tire.tire_id) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetchTirePriceHistory(tire.tire_id);
                if (response && response.price_history) {
                    // Sort price history by date descending (newest first)
                    const sortedHistory = [...response.price_history].sort((a, b) => {
                        return new Date(b.change_timestamp) - new Date(a.change_timestamp);
                    });
                    setPriceHistory(sortedHistory);
                } else {
                    setPriceHistory([]);
                }
            } catch (err) {
                console.error('Error loading price history:', err);
                setError('Failed to load price history data.');
            } finally {
                setLoading(false);
            }
        };

        loadPriceHistory();
    }, [tire]);

    if (!tire) return null;

    // Format price history if available
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('uk-UA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Calculate price change percentage
    const calculatePriceChange = (newPrice, oldPrice) => {
        if (!oldPrice) return 0;
        return ((newPrice - oldPrice) / oldPrice) * 100;
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <button className="close-button" onClick={onClose}>×</button>

                <div className="modal-header">
                    <h2>{tire.tire_name}</h2>
                    <div className="tire-id">ID: {tire.tire_id}</div>
                </div>

                <div className="modal-body">
                    <div className="tire-info-columns">
                        <div className="tire-info-column">
                            <div className="info-section">
                                <h3>Specifications</h3>

                                <div className="info-grid">
                                    <div className="info-label">Brand:</div>
                                    <div className="info-value">{tire.brand_name}</div>

                                    <div className="info-label">Size:</div>
                                    <div className="info-value">{tire.width}/{tire.profil} R{tire.diametr}</div>

                                    <div className="info-label">Model:</div>
                                    <div className="info-value">{tire.model}</div>

                                    <div className="info-label">Season:</div>
                                    <div className="info-value">{tire.season}</div>

                                    <div className="info-label">Current Price:</div>
                                    <div className="info-value price-value">{tire.price} UAH</div>
                                </div>
                            </div>

                            {tire.link && (
                                <div className="info-section">
                                    <h3>Original Source</h3>
                                    <a
                                        href={"https://infoshina.com.ua/" + tire.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="source-link"
                                    >
                                        View on original website
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="tire-info-column">
                            <div className="info-section">
                                <h3>Price History</h3>

                                {loading ? (
                                    <div className="price-history-loading">
                                        <LoadingSpinner />
                                    </div>
                                ) : error ? (
                                    <div className="price-history-error">
                                        {error}
                                    </div>
                                ) : priceHistory.length > 0 ? (
                                    <div className="price-history">
                                        <table className="price-history-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Old Price</th>
                                                    <th>New Price</th>
                                                    <th>Change</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {priceHistory.map((record, index) => {
                                                    const priceChange = record.new_price - record.old_price;
                                                    const percentChange = calculatePriceChange(record.new_price, record.old_price);
                                                    const changeClass = priceChange < 0 ? 'price-decrease' : 'price-increase';

                                                    return (
                                                        <tr key={index}>
                                                            <td>{formatDate(record.change_timestamp)}</td>
                                                            <td>{record.old_price} UAH</td>
                                                            <td>{record.new_price} UAH</td>
                                                            <td className={changeClass}>
                                                                {priceChange < 0 ? '↓' : '↑'}
                                                                {Math.abs(priceChange).toFixed(2)} UAH
                                                                <span className="percent-change">
                                                                    ({Math.abs(percentChange).toFixed(1)}%)
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="no-history">No price change history available</p>
                                )}

                                {priceHistory.length > 0 && (
                                    <div className="price-history-stats">
                                        <div className="stat">
                                            <span className="stat-label">Initial recorded price:</span>
                                            <span className="stat-value">
                                                {priceHistory.length > 0 ?
                                                    `${priceHistory[priceHistory.length - 1].old_price} UAH` :
                                                    'N/A'}
                                            </span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Current price:</span>
                                            <span className="stat-value">{tire.price} UAH</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Total change:</span>
                                            {priceHistory.length > 0 && (
                                                <span className={`stat-value ${tire.price > priceHistory[priceHistory.length - 1].old_price ?
                                                        'price-increase' : 'price-decrease'}`}>
                                                    {tire.price > priceHistory[priceHistory.length - 1].old_price ? '↑' : '↓'}
                                                    {Math.abs(tire.price - priceHistory[priceHistory.length - 1].old_price).toFixed(2)} UAH
                                                    <span className="percent-change">
                                                        ({Math.abs(calculatePriceChange(
                                                            tire.price,
                                                            priceHistory[priceHistory.length - 1].old_price
                                                        )).toFixed(1)}%)
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TireDetailModal;
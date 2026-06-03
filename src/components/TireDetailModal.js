import React, { useState, useEffect } from 'react';
import { fetchTirePriceHistory } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
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
                    // New format: [{ recorded_at, price }, ...] sorted ascending by time
                    setPriceHistory(response.price_history);
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

    const formatDate = (dateString) => {
        const date = new Date(dateString.replace(' ', 'T'));
        return new Intl.DateTimeFormat('uk-UA', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const formatDateShort = (dateString) => {
        const date = new Date(dateString.replace(' ', 'T'));
        return new Intl.DateTimeFormat('uk-UA', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const calculatePriceChange = (newPrice, oldPrice) => {
        if (!oldPrice) return 0;
        return ((newPrice - oldPrice) / oldPrice) * 100;
    };

    // Build chart data and stats from the time series
    const chartData = priceHistory.map(p => ({
        time: formatDateShort(p.recorded_at),
        price: p.price,
        fullDate: p.recorded_at
    }));

    const firstPrice = priceHistory.length > 0 ? priceHistory[0].price : null;
    const lastPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price : null;
    const minPrice = priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)) : null;
    const maxPrice = priceHistory.length > 0 ? Math.max(...priceHistory.map(p => p.price)) : null;
    const totalChange = (firstPrice !== null && lastPrice !== null) ? lastPrice - firstPrice : 0;
    const totalChangePct = calculatePriceChange(lastPrice, firstPrice);

    // Reverse for the table (newest first)
    const tableRows = [...priceHistory].reverse();

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
                                    <div className="price-history-error">{error}</div>
                                ) : priceHistory.length > 0 ? (
                                    <>
                                        {/* Chart */}
                                        <div style={{ width: '100%', height: 240, marginBottom: 16 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                                                    <Tooltip
                                                        formatter={(value) => [`${value} UAH`, 'Price']}
                                                        labelFormatter={(label, payload) => {
                                                            if (payload && payload.length > 0) {
                                                                return formatDate(payload[0].payload.fullDate);
                                                            }
                                                            return label;
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke="#4f46e5"
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Stats */}
                                        <div className="price-history-stats">
                                            <div className="stat">
                                                <span className="stat-label">First recorded:</span>
                                                <span className="stat-value">{firstPrice} UAH</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Current:</span>
                                                <span className="stat-value">{lastPrice} UAH</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Min / Max:</span>
                                                <span className="stat-value">{minPrice} / {maxPrice} UAH</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-label">Total change:</span>
                                                <span className={`stat-value ${totalChange >= 0 ? 'price-increase' : 'price-decrease'}`}>
                                                    {totalChange >= 0 ? '↑' : '↓'}
                                                    {Math.abs(totalChange).toFixed(0)} UAH
                                                    <span className="percent-change">
                                                        ({Math.abs(totalChangePct).toFixed(1)}%)
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Table of all data points */}
                                        <div className="price-history" style={{ marginTop: 16 }}>
                                            <table className="price-history-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Price</th>
                                                        <th>Change</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableRows.map((record, index) => {
                                                        // Compare to the previous point chronologically
                                                        const chronologicalIndex = priceHistory.length - 1 - index;
                                                        const prev = chronologicalIndex > 0 ? priceHistory[chronologicalIndex - 1] : null;
                                                        const diff = prev ? record.price - prev.price : 0;
                                                        const changeClass = diff < 0 ? 'price-decrease' : diff > 0 ? 'price-increase' : '';
                                                        return (
                                                            <tr key={index}>
                                                                <td>{formatDate(record.recorded_at)}</td>
                                                                <td>{record.price} UAH</td>
                                                                <td className={changeClass}>
                                                                    {diff !== 0 ? (
                                                                        <>
                                                                            {diff < 0 ? '↓' : '↑'}
                                                                            {Math.abs(diff).toFixed(0)} UAH
                                                                        </>
                                                                    ) : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <p className="no-history">No price history available yet</p>
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

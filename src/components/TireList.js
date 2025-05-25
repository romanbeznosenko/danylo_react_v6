import React, { useState } from 'react';
import TireDetailModal from './TireDetailModal';
import './TireList.css';

const TireList = ({ tires }) => {
    const [selectedTire, setSelectedTire] = useState(null);

    if (tires.length === 0) {
        return (
            <div className="no-results">
                No tires found. Try adjusting your filters.
            </div>
        );
    }

    const handleTireClick = (tire) => {
        setSelectedTire(tire);
    };

    const closeModal = () => {
        setSelectedTire(null);
    };

    return (
        <div className="tire-list">
            <div className="tire-count">
                {tires.length} tires found
            </div>

            <div className="tire-grid">
                {tires.map(tire => (
                    <div
                        key={tire.tire_id}
                        className="tire-card"
                        onClick={() => handleTireClick(tire)}
                    >
                        <div className="tire-header">
                            <h3>{tire.tire_name}</h3>
                            <div className="tire-brand">{tire.brand_name}</div>
                        </div>

                        <div className="tire-specs">
                            <div className="tire-dimension">
                                <span>{tire.width}</span>/
                                <span>{tire.profil}</span> R
                                <span>{tire.diametr}</span>
                            </div>

                            <div className="tire-details">
                                <div className="detail-item">
                                    <span className="detail-label">Model:</span>
                                    <span className="detail-value">{tire.model}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Season:</span>
                                    <span className="detail-value">{tire.season}</span>
                                </div>
                            </div>
                        </div>

                        <div className="tire-footer">
                            <div className="tire-price">
                                {tire.price} UAH
                            </div>
                            {tire.old_price && (
                                <div className="price-change">
                                    <span className={tire.old_price > tire.price ? 'price-decreased' : 'price-increased'}>
                                        {tire.old_price > tire.price ? '↓' : '↑'}
                                        {Math.abs(tire.old_price - tire.price).toFixed(2)} UAH
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {selectedTire && (
                <TireDetailModal
                    tire={selectedTire}
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

export default TireList;

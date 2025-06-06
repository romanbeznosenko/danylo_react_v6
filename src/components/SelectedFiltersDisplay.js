import React from 'react';
import './SelectedFiltersDisplay.css';

const SelectedFiltersDisplay = ({
    selectedFilters,
    onRemoveFilter,
    onClearAll,
    brands = [],
    vehicleTypes = [],
    seasons = [],
    widths = [],
    profils = [],
    diametrs = [],
    models = []
}) => {
    // Helper function to get display name for filter items
    const getDisplayName = (item, type) => {
        if (typeof item === 'object') {
            switch (type) {
                case 'brands': return item.brand_name || item.name || item;
                case 'vehicleTypes': return item.name || item;
                case 'seasons': return item.name || item;
                case 'widths': return item.width || item;
                case 'profils': return item.profil || item;
                case 'diametrs': return item.diametr || item;
                case 'models': return item.model || item;
                default: return item.toString();
            }
        }
        // Handle boolean values for special filters
        if (typeof item === 'boolean') {
            return item ? 'Так' : 'Ні';
        }
        return item.toString();
    };

    // Helper function to get the key/id for filter items
    const getItemKey = (item, type) => {
        if (typeof item === 'object') {
            switch (type) {
                case 'brands': return item.brand_name || item.name || item.id || item;
                case 'vehicleTypes': return item.id || item.name || item;
                case 'seasons': return item.id || item.name || item;
                case 'widths': return item.width || item.id || item;
                case 'profils': return item.profil || item.id || item;
                case 'diametrs': return item.diametr || item.id || item;
                case 'models': return item.model || item.id || item;
                default: return item.toString();
            }
        }
        // Handle boolean values
        if (typeof item === 'boolean') {
            return item.toString();
        }
        return item.toString();
    };

    // Count total selected filters (including boolean filters)
    const totalSelectedCount = Object.entries(selectedFilters).reduce(
        (total, [key, value]) => {
            if (typeof value === 'boolean') {
                return total + (value ? 1 : 0);
            }
            return total + (value?.length || 0);
        },
        0
    );

    // If no filters selected, don't render anything
    if (totalSelectedCount === 0) {
        return null;
    }

    const filterTypeLabels = {
        brands: 'Бренди',
        vehicleTypes: 'Тип авто',
        seasons: 'Сезон',
        widths: 'Ширина',
        profils: 'Профіль',
        diametrs: 'Діаметр',
        models: 'Модель',
        priceChanged: 'Зміна ціни',
        changedToday: 'Зміни сьогодні'
    };

    return (
        <div className="selected-filters-display">
            <div className="selected-filters-header">
                <h3>Обрані фільтри ({totalSelectedCount})</h3>
                <button
                    className="clear-all-btn"
                    onClick={onClearAll}
                    title="Очистити всі фільтри"
                >
                    Очистити всі
                </button>
            </div>

            <div className="selected-filters-content">
                {Object.entries(selectedFilters).map(([filterType, selectedItems]) => {
                    // Handle boolean filters (priceChanged, changedToday)
                    if (typeof selectedItems === 'boolean') {
                        if (!selectedItems) return null; // Don't show false boolean filters

                        return (
                            <div key={filterType} className="filter-group">
                                <div className="filter-group-header">
                                    <span className="filter-group-label">
                                        {filterTypeLabels[filterType]}:
                                    </span>
                                    <button
                                        className="clear-group-btn"
                                        onClick={() => onRemoveFilter(filterType, false)}
                                        title={`Очистити ${filterTypeLabels[filterType].toLowerCase()}`}
                                    >
                                        Очистити
                                    </button>
                                </div>
                                <div className="filter-tags">
                                    <div className="filter-tag">
                                        <span className="filter-tag-text">Так</span>
                                        <button
                                            className="remove-filter-btn"
                                            onClick={() => onRemoveFilter(filterType, false)}
                                            title={`Видалити ${filterTypeLabels[filterType]}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Handle array filters (brands, seasons, etc.)
                    if (!selectedItems || selectedItems.length === 0) {
                        return null;
                    }

                    return (
                        <div key={filterType} className="filter-group">
                            <div className="filter-group-header">
                                <span className="filter-group-label">
                                    {filterTypeLabels[filterType]}:
                                </span>
                                <button
                                    className="clear-group-btn"
                                    onClick={() => onRemoveFilter(filterType, [])}
                                    title={`Очистити всі ${filterTypeLabels[filterType].toLowerCase()}`}
                                >
                                    Очистити групу
                                </button>
                            </div>
                            <div className="filter-tags">
                                {selectedItems.map((item) => {
                                    const displayName = getDisplayName(item, filterType);
                                    const itemKey = getItemKey(item, filterType);

                                    return (
                                        <div key={itemKey} className="filter-tag">
                                            <span className="filter-tag-text">{displayName}</span>
                                            <button
                                                className="remove-filter-btn"
                                                onClick={() => {
                                                    const newItems = selectedItems.filter(
                                                        selectedItem => getItemKey(selectedItem, filterType) !== itemKey
                                                    );
                                                    onRemoveFilter(filterType, newItems);
                                                }}
                                                title={`Видалити ${displayName}`}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SelectedFiltersDisplay;
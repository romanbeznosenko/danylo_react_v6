import React, { useState } from 'react';
import CheckboxGroup from './CheckboxGroup';
import './FilterPanel.css';

const FilterPanel = ({
    brands,
    vehicleTypes,
    seasons,
    widths,
    profils,
    diametrs,
    models,
    selectedFilters,
    onFilterChange,
    onSearch
}) => {
    const [expandedFilter, setExpandedFilter] = useState('brands'); // Start with brands expanded

    const toggleFilter = (filterName) => {
        setExpandedFilter(expandedFilter === filterName ? null : filterName);
    };

    return (
        <div className="filter-panel">
            <h2>Filters</h2>

            <div className={`filter-section ${expandedFilter === 'brands' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('brands')}>
                    Brands {selectedFilters.brands.length > 0 && <span className="selected-count">({selectedFilters.brands.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'brands' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'brands' && (
                    <CheckboxGroup
                        items={brands}
                        selectedItems={selectedFilters.brands}
                        onChange={(values) => onFilterChange('brands', values)}
                        maxHeight="200px"
                        searchable={true}
                        valueField="brand_name"
                        labelField="brand_name"
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'vehicleTypes' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('vehicleTypes')}>
                    Vehicle Type {selectedFilters.vehicleTypes.length > 0 && <span className="selected-count">({selectedFilters.vehicleTypes.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'vehicleTypes' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'vehicleTypes' && (
                    <CheckboxGroup
                        items={vehicleTypes}
                        selectedItems={selectedFilters.vehicleTypes}
                        onChange={(values) => onFilterChange('vehicleTypes', values)}
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'seasons' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('seasons')}>
                    Season {selectedFilters.seasons.length > 0 && <span className="selected-count">({selectedFilters.seasons.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'seasons' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'seasons' && (
                    <CheckboxGroup
                        items={seasons}
                        selectedItems={selectedFilters.seasons}
                        onChange={(values) => onFilterChange('seasons', values)}
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'widths' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('widths')}>
                    Width {selectedFilters.widths.length > 0 && <span className="selected-count">({selectedFilters.widths.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'widths' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'widths' && (
                    <CheckboxGroup
                        items={widths}
                        selectedItems={selectedFilters.widths}
                        onChange={(values) => onFilterChange('widths', values)}
                        maxHeight="150px"
                        searchable={true}
                        valueField="width"
                        labelField="width"
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'profils' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('profils')}>
                    Profile {selectedFilters.profils.length > 0 && <span className="selected-count">({selectedFilters.profils.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'profils' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'profils' && (
                    <CheckboxGroup
                        items={profils}
                        selectedItems={selectedFilters.profils}
                        onChange={(values) => onFilterChange('profils', values)}
                        maxHeight="150px"
                        searchable={true}
                        valueField="profil"
                        labelField="profil"
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'diametrs' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('diametrs')}>
                    Diameter {selectedFilters.diametrs.length > 0 && <span className="selected-count">({selectedFilters.diametrs.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'diametrs' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'diametrs' && (
                    <CheckboxGroup
                        items={diametrs}
                        selectedItems={selectedFilters.diametrs}
                        onChange={(values) => onFilterChange('diametrs', values)}
                        maxHeight="150px"
                        searchable={true}
                        valueField="diametr"
                        labelField="diametr"
                    />
                )}
            </div>

            <div className={`filter-section ${expandedFilter === 'models' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('models')}>
                    Model {selectedFilters.models.length > 0 && <span className="selected-count">({selectedFilters.models.length})</span>}
                    <span className="toggle-icon">{expandedFilter === 'models' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'models' && (
                    <CheckboxGroup
                        items={models}
                        selectedItems={selectedFilters.models}
                        onChange={(values) => onFilterChange('models', values)}
                        maxHeight="150px"
                        searchable={true}
                        valueField="model"
                        labelField="model"
                    />
                )}
            </div>
            <div className={`filter-section ${expandedFilter === 'priceChanges' ? 'expanded' : ''}`}>
                <h3 onClick={() => toggleFilter('priceChanges')}>
                    Price Changes
                    {(selectedFilters.priceChanged3Days || selectedFilters.priceChanged7Days || selectedFilters.priceChanged) &&
                        <span className="selected-count">(Active)</span>}
                    <span className="toggle-icon">{expandedFilter === 'priceChanges' ? '−' : '+'}</span>
                </h3>

                {expandedFilter === 'priceChanges' && (
                    <div className="price-change-options">
                        <label className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedFilters.priceChanged}
                                onChange={(e) => onFilterChange('priceChanged', e.target.checked)}
                            />
                            <span>Show only tires with price changes</span>
                        </label>

                        <label className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedFilters.priceChanged3Days}
                                onChange={(e) => onFilterChange('priceChanged3Days', e.target.checked)}
                            />
                            <span>Price changed in last 3 days</span>
                        </label>

                        <label className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedFilters.priceChanged7Days}
                                onChange={(e) => onFilterChange('priceChanged7Days', e.target.checked)}
                            />
                            <span>Price changed in last 7 days</span>
                        </label>

                        <label className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedFilters.changedToday}
                                onChange={(e) => onFilterChange('changedToday', e.target.checked)}
                            />
                            <span>Price changed today</span>
                        </label>
                    </div>
                )}
            </div>

            <button
                className="search-button"
                onClick={onSearch}
            >
                Search
            </button>

            {(selectedFilters.brands.length > 0 ||
                selectedFilters.vehicleTypes.length > 0 ||
                selectedFilters.seasons.length > 0 ||
                selectedFilters.widths.length > 0 ||
                selectedFilters.profils.length > 0 ||
                selectedFilters.diametrs.length > 0 ||
                selectedFilters.models.length > 0) && (
                    <button
                        className="clear-button"
                        onClick={() => {
                            onFilterChange('brands', []);
                            onFilterChange('vehicleTypes', []);
                            onFilterChange('seasons', []);
                            onFilterChange('widths', []);
                            onFilterChange('profils', []);
                            onFilterChange('diametrs', []);
                            onFilterChange('models', []);
                            onFilterChange('priceChanged', false);
                            onFilterChange('priceChanged3Days', false);
                            onFilterChange('priceChanged7Days', false);
                            onFilterChange('changedToday', false);
                        }}
                    >
                        Clear Filters
                    </button>
                )}
        </div>
    );
};

export default FilterPanel;
import React, { useState, useEffect } from 'react';
import FilterPanel from '../components/FilterPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import TireDetailModal from '../components/TireDetailModal';
import PriceChangeFilter from '../components/PriceChangeFilter';
import TodayChangeFilter from '../components/TodayChangeFilter';
import { fetchBrands, fetchTireWidths, fetchTireProfils, fetchTireDiametrs, fetchTireModels, fetchTires } from '../services/api';
import './DatabaseTiresPage.css';

const SEASONS = [
    { id: 'Літо', name: 'Літо' },
    { id: 'Зима', name: 'Зима' },
    { id: 'Всесезонні', name: 'Всесезонні' }
];

const VEHICLE_TYPES = [
    { id: 'legkovoj', name: 'Легковий' },
    { id: 'vnedorozhnik', name: 'Позашляховик' },
    { id: 'legko-gruzovoj', name: 'Легковантажний' },
    { id: 'gruzovoj', name: 'Вантажний' },
    { id: 'mototsikl', name: 'Мотоцикл' },
    { id: 'spetstehnika', name: 'Спецтехніка' }
];

const DatabaseTiresPage = () => {
    const [filterData, setFilterData] = useState({
        brands: [],
        widths: [],
        profils: [],
        diametrs: [],
        models: []
    });

    const [tires, setTires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterLoading, setFilterLoading] = useState(true);
    const [selectedTire, setSelectedTire] = useState(null);

    const [selectedFilters, setSelectedFilters] = useState({
        brands: [],
        vehicleTypes: [],
        seasons: [],
        widths: [],
        profils: [],
        diametrs: [],
        models: [],
        priceChanged: false,
        changedToday: false
    });

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'ascending'
    });

    useEffect(() => {
        const loadFilterData = async () => {
            setFilterLoading(true);
            setError(null);

            try {
                // Load filter data
                const [
                    brandsResponse,
                    widthsResponse,
                    profilsResponse,
                    diametrsResponse,
                    modelsResponse
                ] = await Promise.allSettled([
                    fetchBrands(),
                    fetchTireWidths(),
                    fetchTireProfils(),
                    fetchTireDiametrs(),
                    fetchTireModels()
                ]);

                // Update filter data with any successfully loaded data
                setFilterData({
                    brands: brandsResponse.status === 'fulfilled' ? brandsResponse.value.brands || [] : [],
                    widths: widthsResponse.status === 'fulfilled' ? widthsResponse.value.widths || [] : [],
                    profils: profilsResponse.status === 'fulfilled' ? profilsResponse.value.profils || [] : [],
                    diametrs: diametrsResponse.status === 'fulfilled' ? diametrsResponse.value.diametrs || [] : [],
                    models: modelsResponse.status === 'fulfilled' ? modelsResponse.value.models || [] : []
                });
            } catch (err) {
                console.error('Error loading filter data:', err);
                setError('Failed to load filter data. Please check your connection and try again.');
            } finally {
                setFilterLoading(false);
            }
        };

        loadFilterData();
        loadTiresData();
    }, []);

    const loadTiresData = async (filters = {}) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchTires(filters);
            if (response && response.data) {
                setTires(response.data);
            } else {
                setTires([]);
                setError('No tires found in the database.');
            }
        } catch (err) {
            console.error('Error loading tires:', err);
            setError('Failed to load tires. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filterType, values) => {
        setSelectedFilters(prev => ({
            ...prev,
            [filterType]: values
        }));
    };

    const handlePriceChangedToggle = (isChecked) => {
        setSelectedFilters(prev => ({
            ...prev,
            priceChanged: isChecked
        }));
    };

    const handleChangedTodayToggle = (isChecked) => {
        setSelectedFilters(prev => ({
            ...prev,
            changedToday: isChecked
        }));
    };

    const handleSearch = () => {
        const filters = {
            brand_name: selectedFilters.brands,
            seasons: selectedFilters.seasons,
            widths: selectedFilters.widths,
            profils: selectedFilters.profils,
            diametrs: selectedFilters.diametrs,
            models: selectedFilters.models,
            priceChanged: selectedFilters.priceChanged,
            changedToday: selectedFilters.changedToday
        };

        loadTiresData(filters);
    };

    const handleRetry = () => {
        loadTiresData();
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedTires = [...tires].sort((a, b) => {
        if (!sortConfig.key) return 0;

        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];

        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return sortConfig.direction === 'ascending' ? valueA - valueB : valueB - valueA;
        } else {
            const stringA = String(valueA).toLowerCase();
            const stringB = String(valueB).toLowerCase();
            return sortConfig.direction === 'ascending'
                ? stringA.localeCompare(stringB)
                : stringB.localeCompare(stringA);
        }
    });

    const renderSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) return null;
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const handleTireClick = (tire) => {
        setSelectedTire(tire);
    };

    const handleCloseModal = () => {
        setSelectedTire(null);
    };

    const getPriceChangeClass = (tire) => {
        if (!tire.old_price) return '';
        return tire.new_price > tire.old_price ? 'price-increased' : 'price-decreased';
    };

    const getPriceChangeIndicator = (tire) => {
        if (!tire.old_price) return null;
        return tire.new_price > tire.old_price ? '↑' : '↓';
    };

    const isChangedToday = (tire) => {
        if (!tire.change_timestamp) return false;
        const changeDate = new Date(tire.change_timestamp);
        const today = new Date();
        return (
            changeDate.getDate() === today.getDate() &&
            changeDate.getMonth() === today.getMonth() &&
            changeDate.getFullYear() === today.getFullYear()
        );
    };

    return (
        <div className="database-tires-page">
            <div className="container">
                <h1>Tire Database</h1>
                <div className="page-content">
                    {filterLoading ? (
                        <div className="filter-panel-skeleton">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <FilterPanel
                            brands={filterData.brands}
                            vehicleTypes={VEHICLE_TYPES}
                            seasons={SEASONS}
                            widths={filterData.widths}
                            profils={filterData.profils}
                            diametrs={filterData.diametrs}
                            models={filterData.models}
                            selectedFilters={selectedFilters}
                            onFilterChange={handleFilterChange}
                            onSearch={handleSearch}
                            onClearFilters={() => {
                                setSelectedFilters({
                                    brands: [],
                                    vehicleTypes: [],
                                    seasons: [],
                                    widths: [],
                                    profils: [],
                                    diametrs: [],
                                    models: [],
                                    priceChanged: false
                                });
                            }}
                        />
                    )}

                    <div className="results-container">
                        {error && (
                            <ErrorMessage
                                message={error}
                                onRetry={handleRetry}
                            />
                        )}

                        <div className="filter-controls">
                            <PriceChangeFilter
                                checked={selectedFilters.priceChanged}
                                onChange={handlePriceChangedToggle}
                            />

                            <TodayChangeFilter
                                checked={selectedFilters.changedToday}
                                onChange={handleChangedTodayToggle}
                            />
                        </div>

                        {loading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="tires-table-container">
                                {sortedTires.length > 0 ? (
                                    <>
                                        <div className="tires-count">
                                            Found {sortedTires.length} tires
                                            {selectedFilters.changedToday && (
                                                <span className="today-changes-count">
                                                    with price changes today
                                                </span>
                                            )}
                                        </div>
                                        <table className="tires-table">
                                            <thead>
                                                <tr>
                                                    <th onClick={() => handleSort('brand_name')}>
                                                        Brand {renderSortIcon('brand_name')}
                                                    </th>
                                                    <th onClick={() => handleSort('model')}>
                                                        Model {renderSortIcon('model')}
                                                    </th>
                                                    <th>Size</th>
                                                    <th onClick={() => handleSort('season')}>
                                                        Season {renderSortIcon('season')}
                                                    </th>
                                                    <th onClick={() => handleSort('price')}>
                                                        Price {renderSortIcon('price')}
                                                        {selectedFilters.changedToday && <span className="today-filter-active">Today</span>}
                                                    </th>
                                                    <th>Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedTires.map(tire => (
                                                    <tr key={tire.tire_id} className={isChangedToday(tire) ? 'today-change' : ''}>
                                                        <td>{tire.brand_name}</td>
                                                        <td>{tire.model}</td>
                                                        <td>{tire.width}/{tire.profil} R{tire.diametr}</td>
                                                        <td>{tire.season}</td>
                                                        <td className={getPriceChangeClass(tire)}>
                                                            {tire.price} UAH
                                                            {getPriceChangeIndicator(tire)}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="view-details-btn"
                                                                onClick={() => handleTireClick(tire)}
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <div className="no-tires-message">
                                        No tires found matching the selected filters.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {selectedTire && (
                    <TireDetailModal
                        tire={selectedTire}
                        onClose={handleCloseModal}
                    />
                )}
            </div>
        </div>
    );
};

export default DatabaseTiresPage;
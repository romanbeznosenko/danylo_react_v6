import React, { useState, useEffect } from 'react';
import FilterPanel from '../components/FilterPanel';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';
import Pagination from '../components/Pagination';
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

// Helper function to sort numeric values in ascending order
const sortNumericAsc = (items, getValueFn) => {
    return [...items].sort((a, b) => {
        const valueA = parseFloat(getValueFn(a)) || 0;
        const valueB = parseFloat(getValueFn(b)) || 0;
        return valueA - valueB;
    });
};

// Helper function to sort alphabetically (English first, then Ukrainian)
const sortAlphabeticallyMixed = (items, getValueFn) => {
    return [...items].sort((a, b) => {
        const valueA = getValueFn(a).toLowerCase();
        const valueB = getValueFn(b).toLowerCase();

        // Check if strings start with English or Ukrainian letters
        const isEnglishA = /^[a-z]/.test(valueA);
        const isEnglishB = /^[a-z]/.test(valueB);

        // If one is English and other is Ukrainian, English comes first
        if (isEnglishA && !isEnglishB) return -1;
        if (!isEnglishA && isEnglishB) return 1;

        // If both are same type (both English or both Ukrainian), sort alphabetically
        return valueA.localeCompare(valueB, 'uk-UA', { numeric: true });
    });
};

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
    const [apiRetryCount, setApiRetryCount] = useState(0);
    const [shouldRetry, setShouldRetry] = useState(true);

    // Pagination state
    const [paginationInfo, setPaginationInfo] = useState({
        page: 1,
        perPage: 20,
        total: 0,
        totalPages: 0
    });

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
        key: 'brand_name',
        direction: 'asc'
    });

    useEffect(() => {
        const loadFilterData = async () => {
            // Skip if we've reached max retries or shouldn't retry
            if (apiRetryCount >= 3 || !shouldRetry) {
                setFilterLoading(false);
                setLoading(false);
                return;
            }

            setFilterLoading(true);
            setError(null);

            try {
                // Try to load brands data first as it's most important
                const brandsResponse = await fetchBrands();
                if (brandsResponse && brandsResponse.brands) {
                    setFilterData(prev => ({
                        ...prev,
                        brands: brandsResponse.brands
                    }));
                }

                // Load remaining filter data
                try {
                    const [
                        widthsResponse,
                        profilsResponse,
                        diametrsResponse,
                        modelsResponse
                    ] = await Promise.allSettled([
                        fetchTireWidths(),
                        fetchTireProfils(),
                        fetchTireDiametrs(),
                        fetchTireModels()
                    ]);

                    // Update filter data with any successfully loaded data and sort them
                    setFilterData(prev => {
                        const widths = widthsResponse.status === 'fulfilled' ? widthsResponse.value.widths || [] : [];
                        const profils = profilsResponse.status === 'fulfilled' ? profilsResponse.value.profils || [] : [];
                        const diametrs = diametrsResponse.status === 'fulfilled' ? diametrsResponse.value.diametrs || [] : [];
                        const models = modelsResponse.status === 'fulfilled' ? modelsResponse.value.models || [] : [];

                        return {
                            ...prev,
                            // Sort widths by numeric value (ascending)
                            widths: sortNumericAsc(widths, item =>
                                typeof item === 'object' ? item.width : item
                            ),
                            // Sort profils by numeric value (ascending)
                            profils: sortNumericAsc(profils, item =>
                                typeof item === 'object' ? item.profil : item
                            ),
                            // Also sort diameters for consistency
                            diametrs: sortNumericAsc(diametrs, item =>
                                typeof item === 'object' ? item.diametr : item
                            ),
                            // Sort models alphabetically (English first, then Ukrainian)
                            models: sortAlphabeticallyMixed(models, item =>
                                typeof item === 'object' ? item.model : item
                            )
                        };
                    });
                } catch (err) {
                    console.error('Error loading additional filter data:', err);
                    // We'll continue with at least the brands data
                }
            } catch (err) {
                console.error('Error loading filter data:', err);
                setError('Failed to load filter data. Please check your connection and try again.');

                // Retry logic
                if (apiRetryCount < 3 && shouldRetry) {
                    const retryDelay = (apiRetryCount + 1) * 1000; // 1s, 2s, 3s
                    console.log(`Retrying in ${retryDelay}ms... (Attempt ${apiRetryCount + 1}/3)`);

                    setTimeout(() => {
                        setApiRetryCount(prev => prev + 1);
                    }, retryDelay);
                } else {
                    // Stop retrying after 3 attempts
                    setShouldRetry(false);
                }
            } finally {
                setFilterLoading(false);
            }
        };

        loadFilterData();
        loadTiresData({}, 1, 20, sortConfig.key, sortConfig.direction);
    }, [apiRetryCount]);

    const loadTiresData = async (filters = {}, page = 1, perPage = 20, sortBy = 'brand_name', sortOrder = 'asc') => {
        setLoading(true);
        setError(null);

        try {
            // Prepare parameters for the API call
            const apiParams = {
                page,
                per_page: perPage,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            };

            console.log('Loading tires with params:', apiParams);

            const response = await fetchTires(apiParams);

            if (response && response.data) {
                setTires(response.data || []);
                setPaginationInfo({
                    page: response.page || page,
                    perPage: response.per_page || perPage,
                    total: response.total || 0,
                    totalPages: response.total_pages || 0
                });
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

    const handleRemoveFilter = (filterType, newValues) => {
        setSelectedFilters(prev => ({
            ...prev,
            [filterType]: newValues
        }));
    };

    const handleClearFilters = () => {
        setSelectedFilters({
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

        // Reset to page 1 when searching
        setPaginationInfo(prev => ({ ...prev, page: 1 }));
        loadTiresData(filters, 1, paginationInfo.perPage, sortConfig.key, sortConfig.direction);
    };

    const handlePageChange = (newPage) => {
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

        setPaginationInfo(prev => ({ ...prev, page: newPage }));
        loadTiresData(filters, newPage, paginationInfo.perPage, sortConfig.key, sortConfig.direction);
    };

    const handlePerPageChange = (newPerPage) => {
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

        setPaginationInfo(prev => ({ ...prev, perPage: newPerPage, page: 1 }));
        loadTiresData(filters, 1, newPerPage, sortConfig.key, sortConfig.direction);
    };

    const handleManualRetry = () => {
        // Reset retry state and try again
        setShouldRetry(true);
        setApiRetryCount(0);
    };

    const handleRetry = () => {
        loadTiresData({}, paginationInfo.page, paginationInfo.perPage, sortConfig.key, sortConfig.direction);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }

        setSortConfig({ key, direction });

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

        // Keep current page when sorting
        loadTiresData(filters, paginationInfo.page, paginationInfo.perPage, key, direction);
    };

    const sortedTires = tires; // Server-side sorting, no need to sort again

    const renderSortIcon = (columnName) => {
        if (sortConfig.key !== columnName) return ' ↕';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
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
                    <div className="left-section">
                        <SelectedFiltersDisplay
                            selectedFilters={selectedFilters}
                            onRemoveFilter={handleRemoveFilter}
                            onClearAll={handleClearFilters}
                            brands={filterData.brands}
                            vehicleTypes={VEHICLE_TYPES}
                            seasons={SEASONS}
                            widths={filterData.widths}
                            profils={filterData.profils}
                            diametrs={filterData.diametrs}
                            models={filterData.models}
                        />

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
                                onClearFilters={handleClearFilters}
                            />
                        )}
                    </div>

                    <div className="results-container">
                        {error && (
                            <ErrorMessage
                                message={error}
                                onRetry={handleManualRetry}
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
                            <>
                                <div className="tires-table-container">
                                    {sortedTires.length > 0 ? (
                                        <>
                                            <div className="tires-count">
                                                Found {paginationInfo.total} tires
                                                {selectedFilters.changedToday && (
                                                    <span className="today-changes-count">
                                                        with price changes today
                                                    </span>
                                                )}
                                            </div>
                                            <table className="tires-table">
                                                <thead>
                                                    <tr>
                                                        <th onClick={() => handleSort('brand_name')} className="sortable">
                                                            Brand{renderSortIcon('brand_name')}
                                                        </th>
                                                        <th onClick={() => handleSort('model')} className="sortable">
                                                            Model{renderSortIcon('model')}
                                                        </th>
                                                        <th onClick={() => handleSort('width')} className="sortable">
                                                            Size{renderSortIcon('width')}
                                                        </th>
                                                        <th onClick={() => handleSort('season')} className="sortable">
                                                            Season{renderSortIcon('season')}
                                                        </th>
                                                        <th onClick={() => handleSort('price')} className="sortable">
                                                            Price{renderSortIcon('price')}
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

                                {paginationInfo.totalPages > 1 && (
                                    <Pagination
                                        currentPage={paginationInfo.page}
                                        totalPages={paginationInfo.totalPages}
                                        onPageChange={handlePageChange}
                                        perPage={paginationInfo.perPage}
                                        onPerPageChange={handlePerPageChange}
                                        totalItems={paginationInfo.total}
                                        loading={loading}
                                    />
                                )}
                            </>
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
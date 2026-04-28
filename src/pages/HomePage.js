import React, { useState, useEffect } from 'react';
import FilterPanel from '../components/FilterPanel';
import SelectedFiltersDisplay from '../components/SelectedFiltersDisplay';
import TireList from '../components/TireList';
import ActionButtons from '../components/ActionButtons';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import {
    fetchBrands,
    fetchTireWidths,
    fetchTireProfils,
    fetchTireDiametrs,
    fetchTireModels,
    scrapeTires,
    addTiresToDatabase,
    fetchAllTires
} from '../services/api';
import './HomePage.css';

const SEASONS = [
    { id: 'letnie', name: 'Літо' },
    { id: 'zimnie', name: 'Зима' },
    { id: 'vsesezonnye', name: 'Всесезонні' }
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

const HomePage = () => {
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

    const [selectedFilters, setSelectedFilters] = useState({
        brands: [],
        vehicleTypes: [],
        seasons: [],
        widths: [],
        profils: [],
        diametrs: [],
        models: []
    });

    const [filtersApplied, setFiltersApplied] = useState(false);
    const [apiRetryCount, setApiRetryCount] = useState(0);
    const [shouldRetry, setShouldRetry] = useState(true);
    const [searchUrl, setSearchUrl] = useState('');
    const [fetchAllLoading, setFetchAllLoading] = useState(false);
    const [fetchAllProgress, setFetchAllProgress] = useState(null);
    const [fetchAllTiresData, setFetchAllTiresData] = useState([]);

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

                    // Update filter data with any successfully loaded data and sort widths/profils
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
                setLoading(false);
            }
        };

        loadFilterData();
    }, [apiRetryCount]);

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

    // Build the URL for the scraper based on selected filters
    const buildScraperUrl = () => {
    let baseUrl = 'https://infoshina.com.ua/uk/shiny';
    const queryParams = {};

    // Сезон идёт в путь
    if (selectedFilters.seasons.length > 0) {
        const season = typeof selectedFilters.seasons[0] === 'object'
            ? selectedFilters.seasons[0].id
            : selectedFilters.seasons[0];
        baseUrl = `${baseUrl}/${season}`;
    }

    // Ширина/профиль/диаметр в путь
    if (selectedFilters.widths.length > 0) {
        const w = typeof selectedFilters.widths[0] === 'object' ? selectedFilters.widths[0].width : selectedFilters.widths[0];
        baseUrl = `${baseUrl}/w${w}`;
    }
    if (selectedFilters.profils.length > 0) {
        const p = typeof selectedFilters.profils[0] === 'object' ? selectedFilters.profils[0].profil : selectedFilters.profils[0];
        baseUrl = `${baseUrl}/h${p}`;
    }
    if (selectedFilters.diametrs.length > 0) {
        const d = typeof selectedFilters.diametrs[0] === 'object' ? selectedFilters.diametrs[0].diametr : selectedFilters.diametrs[0];
        baseUrl = `${baseUrl}/r${d}`;
    }

    // Все бренды в параметр brand=
    if (selectedFilters.brands.length > 0) {
        const brands = selectedFilters.brands.map(b =>
            (typeof b === 'object' ? b.brand_name : b).toLowerCase()
        );
        queryParams.brand = brands.join(',');
    }

    // Тип авто
    if (selectedFilters.vehicleTypes.length > 0) {
        const types = selectedFilters.vehicleTypes.map(t =>
            typeof t === 'object' ? t.id : t
        );
        queryParams.tip_avto = types.join(',');
    }

    // Модели
    if (selectedFilters.models.length > 0) {
        const models = selectedFilters.models.map(m =>
            typeof m === 'object' ? m.model : m
        );
        queryParams.model = models.join(',');
    }

    const queryString = Object.entries(queryParams)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');

    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    console.log('Generated scraper URL:', url);
    return url;
};

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setTires([]);
        setFiltersApplied(false);

        try {
            // Generate the URL for the scraper based on filters
            const url = buildScraperUrl();
            setSearchUrl(url);

            console.log('Calling scraper with URL:', url);

            // Prepare additional filter data for enhanced scraping
            const additionalFilters = {
                brands: selectedFilters.brands,
                seasons: selectedFilters.seasons,
                vehicleTypes: selectedFilters.vehicleTypes,
                widths: selectedFilters.widths,
                profils: selectedFilters.profils,
                diametrs: selectedFilters.diametrs,
                models: selectedFilters.models
            };

            // Call the enhanced scraper service with the URL and additional filters
            const result = await scrapeTires(url, -1, additionalFilters);

            console.log('Scraper result:', result);

            if (result && result.data && Array.isArray(result.data)) {
                console.log(`Successfully scraped ${result.data.length} tires`);

                // Transform the scraped data to match your TireList component format
                const transformedData = result.data.map(tire => {
                    return {
                        tire_id: tire.id || '',
                        tire_name: tire.name || '',
                        brand_name: tire.brand || '',
                        price: typeof tire.price === 'number' ? tire.price : 0,
                        width: tire.width || '',
                        profil: tire.profil || '',
                        diametr: tire.diametr || '',
                        model: tire.model || '',
                        season: tire.season || '',
                        link: tire.link || ''
                    };
                });

                setTires(transformedData || []);
                setFiltersApplied(true);
            } else {
                console.log('No data found in scraper result:', result);
                setTires([]);
                setError('No results found for the selected filters.');
            }
        } catch (err) {
            console.error('Error in handleSearch:', err);
            setError(`Failed to scrape tires: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToDatabase = async () => {
        if (!tires.length) return;

        setLoading(true);
        try {
            const tiresForBackend = tires.map(t => ({
                id: t.tire_id,
                name: t.tire_name,
                brand: t.brand_name,
                price: t.price,
                width: t.width,
                profil: t.profil,
                diametr: t.diametr,
                model: t.model,
                season: t.season,
                link: t.link
            }));
            await addTiresToDatabase(tiresForBackend);
            alert('Tires successfully added to database!');
        } catch (err) {
            setError('Failed to add tires to database.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Fetch All handlers ──

    const handleFetchAll = async () => {
        if (fetchAllLoading) return;

        const confirmed = window.confirm(
            'This will fetch ALL tires from infoshina.com.ua (~165,000+). ' +
            'This may take 3-10 minutes. Continue?'
        );
        if (!confirmed) return;

        setFetchAllLoading(true);
        setFetchAllProgress({ status: 'started', progress: 0, total_tires: 0 });
        setFetchAllTiresData([]);
        setError(null);

        try {
            const result = await fetchAllTires((status) => {
                setFetchAllProgress(status);
            });

            setFetchAllTiresData(result.data);
            setFetchAllProgress(null);
            alert(`Fetch complete! Found ${result.total_tires} tires. Choose: Save to DB or Download CSV.`);
        } catch (err) {
            setError(`Fetch All failed: ${err.message}`);
            console.error(err);
            setFetchAllProgress(null);
        } finally {
            setFetchAllLoading(false);
        }
    };

    const handleFetchAllSaveToDb = async () => {
        if (!fetchAllTiresData.length) return;

        setFetchAllLoading(true);
        try {
            await addTiresToDatabase(fetchAllTiresData);
            alert(`Saved ${fetchAllTiresData.length} tires to database!`);
        } catch (err) {
            setError('Failed to save tires to database.');
            console.error(err);
        } finally {
            setFetchAllLoading(false);
        }
    };

    const handleFetchAllExportCsv = () => {
        if (!fetchAllTiresData.length) return;

        const headers = ['ID', 'Name', 'Brand', 'Price', 'Width', 'Profile', 'Diameter', 'Model', 'Season', 'Link'];
        const csvRows = [headers.join(',')];

        fetchAllTiresData.forEach(tire => {
            const row = [
                tire.id,
                tire.name,
                tire.brand,
                tire.price,
                tire.width,
                tire.profil,
                tire.diametr,
                tire.model,
                tire.season,
                tire.link
            ].map(value => `"${value || ''}"`);
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `all_tires_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportToCsv = () => {
        if (!tires.length) return;

        // Create CSV content
        const headers = ['ID', 'Name', 'Brand', 'Price', 'Width', 'Profile', 'Diameter', 'Model', 'Season', 'Link'];
        const csvRows = [headers.join(',')];

        tires.forEach(tire => {
            const row = [
                tire.tire_id,
                tire.tire_name,
                tire.brand_name,
                tire.price,
                tire.width,
                tire.profil,
                tire.diametr,
                tire.model,
                tire.season,
                tire.link
            ].map(value => `"${value || ''}"`);

            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', 'tires_export.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleManualRetry = () => {
        // Reset retry state and try again
        setShouldRetry(true);
        setApiRetryCount(0);
    };

    const handleClearFilters = () => {
        setSelectedFilters({
            brands: [],
            vehicleTypes: [],
            seasons: [],
            widths: [],
            profils: [],
            diametrs: [],
            models: []
        });
    };

    return (
        <div className="home-page">
            <div className="container">
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
                            onClearFilters={handleClearFilters}
                        />
                    )}

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

                    <div className="results-container">
                        {/* ── Fetch All Section ── */}
                        <div style={{
                            padding: '16px',
                            marginBottom: '16px',
                            background: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleFetchAll}
                                    disabled={fetchAllLoading || loading}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: fetchAllLoading ? '#6c757d' : '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: fetchAllLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >
                                    {fetchAllLoading ? 'Fetching...' : 'Fetch All Tires'}
                                </button>
                                <span style={{ color: '#6c757d', fontSize: '13px' }}>
                                    Fetch all ~165K tires from infoshina.com.ua (multithreaded)
                                </span>
                            </div>

                            {/* Progress bar */}
                            {fetchAllProgress && (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                        <span>
                                            {fetchAllProgress.status === 'scraping' && `Scraping: page ${fetchAllProgress.current_page || '?'}/${fetchAllProgress.total_pages || '?'} — ${fetchAllProgress.total_tires || 0} tires`}
                                            {fetchAllProgress.status === 'started' && 'Starting...'}
                                        </span>
                                        <span>{fetchAllProgress.progress || 0}%</span>
                                    </div>
                                    <div style={{
                                        width: '100%', height: '8px',
                                        backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${fetchAllProgress.progress || 0}%`,
                                            height: '100%',
                                            backgroundColor: '#007bff',
                                            transition: 'width 0.3s ease',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {/* Action buttons after fetch completes */}
                            {fetchAllTiresData.length > 0 && !fetchAllLoading && (
                                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                                        ✓ {fetchAllTiresData.length.toLocaleString()} tires fetched
                                    </span>
                                    <button
                                        onClick={handleFetchAllSaveToDb}
                                        style={{
                                            padding: '8px 20px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Save to Database
                                    </button>
                                    <button
                                        onClick={handleFetchAllExportCsv}
                                        style={{
                                            padding: '8px 20px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Download CSV
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <ErrorMessage
                                message={error}
                                onRetry={handleManualRetry}
                            />
                        )}

                        {searchUrl && (
                            <div className="search-url">
                                <h3>Search URL</h3>
                                <a href={searchUrl} target="_blank" rel="noopener noreferrer">{searchUrl}</a>
                            </div>
                        )}

                        {loading && !error ? (
                            <LoadingSpinner />
                        ) : (
                            <>
                                {filtersApplied && (
                                    <ActionButtons
                                        onAddToDatabase={handleAddToDatabase}
                                        onExportToCsv={handleExportToCsv}
                                        disabled={tires.length === 0}
                                    />
                                )}

                                {!error && (
                                    <>
                                        {tires.length > 0 ? (
                                            <div className="tires-stats">
                                                <p>Found {tires.length} tires matching your criteria</p>
                                            </div>
                                        ) : filtersApplied && (
                                            <div className="no-results">
                                                <p>No tires found matching your criteria. Try adjusting your filters.</p>
                                            </div>
                                        )}
                                        <TireList tires={tires} />
                                    </>
                                )}

                                {tires.length > 0 && (
                                    <ActionButtons
                                        onAddToDatabase={handleAddToDatabase}
                                        onExportToCsv={handleExportToCsv}
                                        disabled={false}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;

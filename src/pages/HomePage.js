import React, { useState, useEffect } from 'react';
import FilterPanel from '../components/FilterPanel';
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
    addTiresToDatabase
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

                    // Update filter data with any successfully loaded data
                    setFilterData(prev => ({
                        ...prev,
                        widths: widthsResponse.status === 'fulfilled' ? widthsResponse.value.widths || [] : [],
                        profils: profilsResponse.status === 'fulfilled' ? profilsResponse.value.profils || [] : [],
                        diametrs: diametrsResponse.status === 'fulfilled' ? diametrsResponse.value.diametrs || [] : [],
                        models: modelsResponse.status === 'fulfilled' ? modelsResponse.value.models || [] : []
                    }));
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

    // Build the URL for the scraper based on selected filters
    const buildScraperUrl = () => {
        // Base URL components
        let baseUrl = 'https://infoshina.com.ua/uk/shiny';
        const queryParams = {};
        const pathComponents = [];
        
        // Add brand to path if selected
        if (selectedFilters.brands.length > 0) {
            const brandValue = selectedFilters.brands[0];
            const brandName = typeof brandValue === 'object' ? brandValue.brand_name : brandValue;
            pathComponents.push(brandName.toLowerCase());
        }
        
        // Add width/height/radius components to the path in the correct format
        if (selectedFilters.widths.length > 0) {
            const widthValue = selectedFilters.widths[0];
            const width = typeof widthValue === 'object' ? widthValue.width : widthValue;
            pathComponents.push(`w${width}`);
        }
        
        if (selectedFilters.profils.length > 0) {
            const profilValue = selectedFilters.profils[0];
            const profil = typeof profilValue === 'object' ? profilValue.profil : profilValue;
            pathComponents.push(`h${profil}`);
        }
        
        if (selectedFilters.diametrs.length > 0) {
            const diametrValue = selectedFilters.diametrs[0];
            const diametr = typeof diametrValue === 'object' ? diametrValue.diametr : diametrValue;
            pathComponents.push(`r${diametr}`);
        }
        
        // Handle additional brands (beyond the first) in query parameters
        if (selectedFilters.brands.length > 1) {
            const brandValues = selectedFilters.brands.map(brand =>
                typeof brand === 'object' ? brand.brand_name : brand
            );
            queryParams.brand = brandValues.join(',');
        }
        
        // Add seasons as a comma-separated list
        if (selectedFilters.seasons.length > 0) {
            const seasonValues = selectedFilters.seasons.map(season =>
                typeof season === 'object' ? season.id : season
            );
            queryParams.sezon = seasonValues.join(',');
        }

        // Add vehicle types as a comma-separated list
        if (selectedFilters.vehicleTypes.length > 0) {
            const vehicleTypeValues = selectedFilters.vehicleTypes.map(type =>
                typeof type === 'object' ? type.id : type
            );
            queryParams.tip_avto = vehicleTypeValues.join(',');
        }
        
        // Add models as a comma-separated list
        if (selectedFilters.models.length > 0) {
            const modelValues = selectedFilters.models.map(model =>
                typeof model === 'object' ? model.model : model
            );
            queryParams.model = modelValues.join(',');
        }
        
        // Build the URL with path components
        if (pathComponents.length > 0) {
            baseUrl = `${baseUrl}/${pathComponents.join('/')}`;
        }
        
        // Build query string
        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        // Construct the final URL
        const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
        console.log('Generated scraper URL:', url);
        return url;
    };

    const handleSearch = async () => {
        setLoading(true);
        setError(null);

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
            await addTiresToDatabase(tires);
            alert('Tires successfully added to database!');
        } catch (err) {
            setError('Failed to add tires to database.');
            console.error(err);
        } finally {
            setLoading(false);
        }
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

                    <div className="results-container">
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
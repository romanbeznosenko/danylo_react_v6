import React, { useState } from 'react';
import { scrapeTires, addTiresToDatabase } from '../services/api';
import './ScraperPage.css';

const ScraperPage = () => {
    const [url, setUrl] = useState('');
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleScrape = async () => {
        if (!url) {
            setError('Please enter a valid URL');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await scrapeTires(url, pageCount);

            if (data.error) {
                setError(data.error);
            } else {
                setResults(data.data);
            }
        } catch (err) {
            setError('Failed to scrape data. Please check the URL and try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToDatabase = async () => {
        if (!results || results.length === 0) {
            return;
        }

        setLoading(true);

        try {
            // Convert scraped results to format expected by API
            const tiresForDb = results.map(tire => ({
                tire_id: tire.id,
                tire_name: tire.name,
                price: tire.price,
                width: tire.width,
                profil: tire.profil,
                diametr: tire.diametr,
                model: tire.model,
                season: tire.season,
                brand_name: tire.brand,
                link: tire.link
            }));

            await addTiresToDatabase(tiresForDb);
            alert('Tires successfully added to database!');
        } catch (err) {
            setError('Failed to add tires to database.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportToCsv = () => {
        if (!results || results.length === 0) return;

        // Create CSV content
        const headers = ['ID', 'Name', 'Brand', 'Price', 'Width', 'Profile', 'Diameter', 'Model', 'Season', 'Link'];
        const csvRows = [headers.join(',')];

        results.forEach(tire => {
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
            ].map(value => `"${value}"`);

            csvRows.push(row.join(','));
        });

        // Create download link
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', 'scraped_tires.csv');
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="scraper-page">
            <div className="container">
                <h1>Tire Scraper</h1>

                <div className="scraper-form">
                    <div className="form-group">
                        <label htmlFor="scrape-url">URL to Scrape</label>
                        <input
                            id="scrape-url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter URL from infoshina.com.ua"
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="page-count">Number of Pages to Scrape</label>
                        <input
                            id="page-count"
                            type="number"
                            min="1"
                            value={pageCount}
                            onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
                            className="form-control"
                        />
                        <small>Use -1 for all pages</small>
                    </div>

                    <button
                        className="primary-button"
                        onClick={handleScrape}
                        disabled={loading}
                    >
                        {loading ? 'Scraping...' : 'Start Scraping'}
                    </button>
                </div>

                {error && (
                    <div className="error-message">{error}</div>
                )}

                {results && results.length > 0 && (
                    <div className="results-section">
                        <div className="results-header">
                            <h2>Scraped {results.length} tires</h2>

                            <div className="action-buttons">
                                <button
                                    className="database-button"
                                    onClick={handleAddToDatabase}
                                    disabled={loading}
                                >
                                    Add to Database
                                </button>

                                <button
                                    className="csv-button"
                                    onClick={handleExportToCsv}
                                >
                                    Export to CSV
                                </button>
                            </div>
                        </div>

                        <div className="results-table-container">
                            <table className="results-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Brand</th>
                                        <th>Price</th>
                                        <th>Size</th>
                                        <th>Model</th>
                                        <th>Season</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(tire => (
                                        <tr key={tire.id}>
                                            <td>{tire.id}</td>
                                            <td>{tire.name}</td>
                                            <td>{tire.brand}</td>
                                            <td>{tire.price} UAH</td>
                                            <td>{`${tire.width}/${tire.profil} R${tire.diametr}`}</td>
                                            <td>{tire.model}</td>
                                            <td>{tire.season}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScraperPage;
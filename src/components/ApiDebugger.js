import React, { useState } from 'react';
import axios from 'axios';

const ApiDebugger = () => {
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);

    const testEndpoints = async () => {
        setLoading(true);
        const endpoints = [
            { name: 'API Base', url: 'http://localhost:8080/api' },
            { name: 'Brands', url: 'http://localhost:8080/api/brands' },
            { name: 'Tire Widths', url: 'http://localhost:8080/api/tires/width' },
            { name: 'Tire Profiles', url: 'http://localhost:8080/api/tires/profil' },
            { name: 'Tire Diameters', url: 'http://localhost:8080/api/tires/diametr' },
            { name: 'Tire Models', url: 'http://localhost:8080/api/tires/model' },
            { name: 'Scraper', url: 'http://localhost:8081/scrape' }
        ];

        const results = {};

        for (const endpoint of endpoints) {
            try {
                const startTime = new Date();
                const response = await axios.get(endpoint.url, { timeout: 5000 });
                const endTime = new Date();
                const responseTime = endTime - startTime;

                results[endpoint.name] = {
                    status: response.status,
                    statusText: response.statusText,
                    responseTime: `${responseTime}ms`,
                    success: true,
                    dataPreview: JSON.stringify(response.data).substring(0, 100) + '...'
                };
            } catch (error) {
                results[endpoint.name] = {
                    status: error.response ? error.response.status : 'Network Error',
                    statusText: error.response ? error.response.statusText : error.message,
                    success: false,
                    error: error.message
                };
            }
        }

        setResults(results);
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>API Connection Debugger</h2>
            <p>This tool will help diagnose connection issues with your backend APIs.</p>

            <button
                onClick={testEndpoints}
                disabled={loading}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
            >
                {loading ? 'Testing Endpoints...' : 'Test API Endpoints'}
            </button>

            {loading && <p>Testing connections...</p>}

            {Object.keys(results).length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Results:</h3>
                    {Object.entries(results).map(([endpointName, result]) => (
                        <div
                            key={endpointName}
                            style={{
                                marginBottom: '10px',
                                padding: '10px',
                                borderRadius: '4px',
                                backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
                                border: result.success ? '1px solid #a5d6a7' : '1px solid #ef9a9a'
                            }}
                        >
                            <h4 style={{ margin: '0 0 5px 0' }}>{endpointName}</h4>
                            <div style={{ fontSize: '14px' }}>
                                <div><strong>URL:</strong> {endpoints.find(e => e.name === endpointName)?.url}</div>
                                <div><strong>Status:</strong> {result.status} {result.statusText}</div>
                                {result.success ? (
                                    <>
                                        <div><strong>Response Time:</strong> {result.responseTime}</div>
                                        <div><strong>Data Preview:</strong> {result.dataPreview}</div>
                                    </>
                                ) : (
                                    <div><strong>Error:</strong> {result.error}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApiDebugger;
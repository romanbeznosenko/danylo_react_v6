import axios from 'axios';

const API_BASE_URL = 'https://danylofastapi-production.up.railway.app/api';
// const API_BASE_URL = 'http://127.0.0.1:8080/api';
const SCRAPER_URL = 'https://danyloscrape-production.up.railway.app/scrape';
// const SCRAPER_URL = 'http://0.0.0.0:8081/scrape';

export const fetchBrands = async () => {
    try {
        console.info(`Link: ${API_BASE_URL}/brands`);
        const response = await axios.get(`${API_BASE_URL}/brands`);
        return response.data;
    } catch (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
};

export const fetchTires = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();

        // Add pagination parameters
        if (params.page) {
            queryParams.append('page', params.page.toString());
        }

        if (params.per_page) {
            queryParams.append('per_page', params.per_page.toString());
        }

        // Add sorting parameters
        if (params.sort_by) {
            queryParams.append('sort_by', params.sort_by);
        }

        if (params.sort_order) {
            queryParams.append('sort_order', params.sort_order);
        }

        // Add filter parameters
        if (params.brand_name && params.brand_name.length > 0) {
            params.brand_name.forEach(brand => {
                const brandName = typeof brand === 'object' ? brand.brand_name : brand;
                queryParams.append('brand_name', brandName);
            });
        }

        if (params.seasons && params.seasons.length > 0) {
            params.seasons.forEach(season => {
                const seasonName = typeof season === 'object' ? season.id : season;
                queryParams.append('seasons', seasonName);
            });
        }

        if (params.widths && params.widths.length > 0) {
            params.widths.forEach(width => {
                const widthValue = typeof width === 'object' ? width.width : width;
                queryParams.append('widths', widthValue);
            });
        }

        if (params.profils && params.profils.length > 0) {
            params.profils.forEach(profil => {
                const profilValue = typeof profil === 'object' ? profil.profil : profil;
                queryParams.append('profils', profilValue);
            });
        }

        if (params.diametrs && params.diametrs.length > 0) {
            params.diametrs.forEach(diametr => {
                const diametrValue = typeof diametr === 'object' ? diametr.diametr : diametr;
                queryParams.append('diametrs', diametrValue);
            });
        }

        if (params.models && params.models.length > 0) {
            params.models.forEach(model => {
                const modelValue = typeof model === 'object' ? model.model : model;
                queryParams.append('models', modelValue);
            });
        }

        // Add priceChanged filter parameter
        if (params.priceChanged) {
            queryParams.append('price_changed', 'true');
        }

        // Add changedToday filter parameter
        if (params.changedToday) {
            queryParams.append('changed_today', 'true');
        }

        const url = `${API_BASE_URL}/tires${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        console.log('Fetching tires with URL:', url);

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching tires:', error);
        throw error;
    }
};

// Improved scrapeTires function that matches Django implementation
export const scrapeTires = async (url, pageCount = -1, additionalFilters = null) => {
    try {
        console.log('Scraping tires from URL:', url);
        console.log('Page count:', pageCount);
        console.log('Additional filters:', additionalFilters);

        // Create the request payload in the same format as Django
        const requestPayload = {
            url: url,
            page_count: pageCount
        };

        // Add additional filters if provided
        if (additionalFilters) {
            requestPayload.filters = additionalFilters;
        }

        console.log('Request payload:', requestPayload);

        // Add debug info to monitor network request
        console.log('Sending POST request to:', SCRAPER_URL);

        // Match the exact request format used in Django
        const response = await axios.post(SCRAPER_URL, requestPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 90000, // Longer timeout for complex scrapes (90 seconds)
            withCredentials: false
        });

        console.log('Scraper response status:', response.status);
        console.log('Scraper response headers:', response.headers);

        // Log the first part of the response data for debugging
        const responsePreview = response.data ?
            JSON.stringify(response.data).substring(0, 200) + '...' :
            'No response data';
        console.log('Scraper response preview:', responsePreview);

        // Check for error message in the response
        if (response.data && response.data.error) {
            console.error('Scraper returned an error:', response.data.error);
            throw new Error(response.data.error);
        }

        // Check for the expected data format
        if (!response.data || !response.data.data) {
            console.error('Unexpected response format:', response.data);
            throw new Error('The scraper response does not contain the expected data format');
        }

        // Return the data in the same structure expected by the component
        return response.data;
    } catch (error) {
        console.error('Error scraping tires:', error);

        // Detailed error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            console.error('Response data:', error.response.data);
            throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request sent but no response received');
            console.error('Request details:', error.request);
            throw new Error('No response received from scraper server. Please check if it is running.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
            throw error;
        }
    }
};

export const addTiresToDatabase = async (tires) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/tires`, tires);
        return response.data;
    } catch (error) {
        console.error('Error adding tires to database:', error);
        throw error;
    }
};

// Additional helper functions for fetching specific tire attributes
export const fetchTireWidths = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tires/width`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tire widths:', error);
        throw error;
    }
};

export const fetchTireProfils = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tires/profil`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tire profiles:', error);
        throw error;
    }
};

export const fetchTireDiametrs = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tires/diametr`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tire diameters:', error);
        throw error;
    }
};

export const fetchTireModels = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tires/model`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tire models:', error);
        throw error;
    }
};

export const fetchTirePriceHistory = async (tireId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tires/${tireId}/price_history`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tire price history:', error);
        throw error;
    }
};
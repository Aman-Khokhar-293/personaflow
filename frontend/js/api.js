/**
 * PersonaFlow - API Client
 * Handles all HTTP requests to the backend
 */

const API = {
    // Use relative URL since frontend is served from Flask
    baseUrl: '/api',

    /**
     * Make HTTP request
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Request failed');
            }

            return result;
        } catch (error) {
            console.error(`API ${method} ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * GET request
     */
    get(endpoint) {
        return this.request('GET', endpoint);
    },

    /**
     * POST request
     */
    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    },

    /**
     * PUT request
     */
    put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    },

    /**
     * DELETE request
     */
    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
};

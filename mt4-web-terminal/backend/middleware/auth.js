const crypto = require('crypto');

// In-memory storage for API keys (replace with database in production)
const apiKeys = new Map();

// Generate a secure API key
const generateApiKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Validate API key middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    if (!apiKeys.has(apiKey)) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    req.account = apiKeys.get(apiKey);
    next();
};

// Store new API key
const storeApiKey = (accountId) => {
    const apiKey = generateApiKey();
    apiKeys.set(apiKey, { accountId, createdAt: new Date() });
    return apiKey;
};

module.exports = { validateApiKey, generateApiKey, storeApiKey };
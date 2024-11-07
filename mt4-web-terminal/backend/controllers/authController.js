const { v4: uuidv4 } = require('uuid');

exports.generateApiKey = async (req, res) => {
    try {
        const apiKey = uuidv4();
        // Store API key securely
        // In production, use a database
        
        res.json({ apiKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
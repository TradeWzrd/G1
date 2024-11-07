const router = require('express').Router();

router.post('/generate-key', (req, res) => {
    try {
        const apiKey = 'test-key-' + Date.now();
        res.json({ apiKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
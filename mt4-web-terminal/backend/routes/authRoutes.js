const router = require('express').Router();
const { storeApiKey } = require('../middleware/auth');

router.post('/generate-key', async (req, res) => {
    try {
        const { accountId } = req.body;
        if (!accountId) {
            return res.status(400).json({ error: 'Account ID is required' });
        }

        const apiKey = storeApiKey(accountId);
        res.json({ apiKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
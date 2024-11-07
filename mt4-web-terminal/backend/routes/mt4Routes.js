const router = require('express').Router();

// MT4 update endpoint
router.post('/update', (req, res) => {
    try {
        const mt4Data = req.body;
        res.json({ success: true, commands: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// MT4 trade endpoint
router.post('/trade', (req, res) => {
    try {
        const tradeCommand = req.body;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
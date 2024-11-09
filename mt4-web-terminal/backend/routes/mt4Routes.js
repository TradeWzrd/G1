const router = require('express').Router();

// Function to parse incoming data (assuming this function exists)
const parseData = (dataString) => {
    // ... existing parsing logic ...
};

// MT4 update endpoint
router.post('/update', (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);
        const data = parseData(req.body);
        
        if (data) {
            lastUpdate = data;
            eaConnected = true;

            // Get any pending commands and send them to EA
            const commands = pendingCommands;
            pendingCommands = []; // Clear the queue

            // Format commands array properly
            const formattedCommands = commands.length > 0 ? commands : [];

            // Send response with properly formatted commands array
            res.json({ 
                success: true,
                commands: formattedCommands
            });
        } else {
            res.json({ 
                success: false, 
                error: 'Invalid data format',
                commands: []
            });
        }
    } catch (error) {
        console.error('Error processing update:', error);
        res.json({ 
            success: false, 
            error: error.message,
            commands: []
        });
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
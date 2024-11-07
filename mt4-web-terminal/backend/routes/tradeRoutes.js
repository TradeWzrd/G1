const express = require('express');
const router = express.Router();

// Store pending trade commands
const tradeCommands = new Map();

router.post('/trade', async (req, res) => {
    try {
        const command = {
            id: Date.now().toString(),
            status: 'pending',
            timestamp: new Date(),
            ...req.body
        };

        // Store command for EA to pick up
        tradeCommands.set(command.id, command);

        // Clean up old commands (older than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (const [id, cmd] of tradeCommands) {
            if (cmd.timestamp < fiveMinutesAgo) {
                tradeCommands.delete(id);
            }
        }

        res.json({ 
            success: true, 
            message: 'Trade command queued',
            commandId: command.id 
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for EA to get pending commands
router.get('/trade/pending', (req, res) => {
    const commands = Array.from(tradeCommands.values())
        .filter(cmd => cmd.status === 'pending');
    res.json({ commands });
});

// Endpoint for EA to update command status
router.post('/trade/status', (req, res) => {
    const { commandId, status, result } = req.body;
    
    if (tradeCommands.has(commandId)) {
        const command = tradeCommands.get(commandId);
        command.status = status;
        command.result = result;
        tradeCommands.set(commandId, command);
    }
    
    res.json({ success: true });
});

module.exports = router;
const express = require('express');
const router = express.Router();

// Store pending trade commands
const tradeCommands = new Map();

// Handle trade commands
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

        console.log('New trade command:', command);
        res.json({
            success: true,
            message: 'Trade command queued',
            commandId: command.id
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get pending commands
router.get('/trade/pending', (req, res) => {
    try {
        const pendingCommands = Array.from(tradeCommands.values())
            .filter(cmd => cmd.status === 'pending');

        res.json({ commands: pendingCommands });
    } catch (error) {
        console.error('Error getting pending commands:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message,
            commands: []
        });
    }
});

// Update command status
router.post('/trade/status', (req, res) => {
    try {
        const { commandId, status, result } = req.body;
        
        if (tradeCommands.has(commandId)) {
            const command = tradeCommands.get(commandId);
            command.status = status;
            command.result = result;
            tradeCommands.set(commandId, command);
            
            console.log('Updated command status:', command);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating command status:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
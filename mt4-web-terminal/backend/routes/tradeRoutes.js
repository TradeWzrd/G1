const express = require('express');
const router = express.Router();

// Store pending trade commands (in-memory storage)
const tradeCommands = new Map();

// Get pending trade commands
router.get('/trade/pending', (req, res) => {
    try {
        // Get all pending commands
        const pendingCommands = Array.from(tradeCommands.values())
            .filter(cmd => cmd.status === 'pending');
            
        console.log('Pending commands:', pendingCommands);
        res.json({ commands: pendingCommands });
    } catch (error) {
        console.error('Error getting pending commands:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit new trade command
router.post('/trade', (req, res) => {
    try {
        const command = {
            id: Date.now().toString(),
            status: 'pending',
            timestamp: new Date(),
            ...req.body
        };

        // Store command
        tradeCommands.set(command.id, command);
        console.log('New trade command received:', command);

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
        console.error('Error submitting trade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update trade command status
router.post('/trade/status', (req, res) => {
    try {
        const { commandId, status, success, error } = req.body;
        
        if (tradeCommands.has(commandId)) {
            const command = tradeCommands.get(commandId);
            command.status = status;
            command.success = success;
            command.error = error;
            command.completedAt = new Date();
            tradeCommands.set(commandId, command);
            
            console.log('Command status updated:', command);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating command status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
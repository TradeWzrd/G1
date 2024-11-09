app.post('/api/mt4/update', express.text(), (req, res) => {
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
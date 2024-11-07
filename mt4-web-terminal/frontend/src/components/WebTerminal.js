import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import TradingPanel from './TradingPanel';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const ws = new WebSocket('wss://g1-back.onrender.com');
        
        ws.onopen = () => {
            console.log('WebSocket Connected');
            setConnected(true);
            setError(null);
        };
        
        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setConnected(false);
            setEAConnected(false);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received data:', data);
                
                if (data.type === 'update' || data.type === 'status') {
                    setEAConnected(data.connected);
                    if (data.data) {
                        // Set account data
                        setAccountData(data.data.account);
                        // Set positions if available
                        if (data.data.positions) {
                            setPositions(data.data.positions);
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    };

    return (
        <div className="space-y-6 p-4">
            {/* Connection Status */}
            <div className={`p-4 rounded-lg ${connected ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${connected ? 'text-green-700' : 'text-red-700'}`}>
                    {connected ? 'Connected to Trading Server' : 'Disconnected from Trading Server'}
                </p>
                <p className={`text-sm mt-2 ${eaConnected ? 'text-green-700' : 'text-yellow-700'}`}>
                    {eaConnected ? 'EA Connected' : 'EA Not Connected'}
                </p>
                {accountData && (
                    <div className="mt-2 text-sm text-gray-600">
                        <p>Account: {accountData.number}</p>
                        <p>Leverage: {accountData.leverage}</p>
                    </div>
                )}
            </div>

            {/* Account Overview */}
            {accountData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Account Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Balance</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.balance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Equity</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.equity)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Margin</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.margin)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Free Margin</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.freeMargin)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trading Panel */}
            {eaConnected && (
                <TradingPanel positions={positions} />
            )}
        </div>
    );
};

export default WebTerminal;
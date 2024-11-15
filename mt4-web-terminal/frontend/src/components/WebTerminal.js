import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WebTerminal = () => {
    const [connected, setConnected] = useState(false);
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: '',
        takeProfit: '',
        comment: 'Web Terminal'
    });
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);

    // Connect to WebSocket
    useEffect(() => {
        const connectWebSocket = () => {
            reconnectAttempts.current++;
            const wsUrl = process.env.REACT_APP_WS_URL || 'wss://g1-back.onrender.com';
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setConnected(true);
                // Only show connection notification on first connect
                if (reconnectAttempts.current === 1) {
                    toast.success('Connected to server', { autoClose: 2000 });
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setConnected(false);
                // Only show disconnection notification if we were previously connected
                if (connected) {
                    toast.error('Disconnected from server', { autoClose: 2000 });
                }
                setTimeout(connectWebSocket, 5000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                // Don't show error toast as disconnect will show anyway
            };

            ws.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    // Handle WebSocket messages
    const handleWebSocketMessage = useCallback((message) => {
        switch (message.type) {
            case 'update':
                if (message.data) {
                    // Update account data
                    if (message.data.account) {
                        setAccountData(message.data.account);
                    }
                    // Update positions
                    if (message.data.positions) {
                        setPositions(message.data.positions);
                    }
                }
                break;
            case 'status':
                setConnected(message.connected);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }, []);

    // Send trade command
    const sendTradeCommand = async (action, ticket = null) => {
        if (!connected) {
            toast.error('Not connected to server');
            return;
        }

        try {
            const params = {
                risk: parseFloat(newOrder.lots)
            };

            if (newOrder.stopLoss) params.sl = parseFloat(newOrder.stopLoss);
            if (newOrder.takeProfit) params.tp = parseFloat(newOrder.takeProfit);
            if (newOrder.comment) params.comment = newOrder.comment;
            if (ticket) params.ticket = ticket;

            const command = {
                action,
                symbol: newOrder.symbol,
                params
            };

            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command)
            });

            const data = await response.json();
            if (data.status === 'command_sent') {
                toast.success(`${action.toUpperCase()} order sent`);
            } else {
                toast.error('Failed to send order');
            }
        } catch (error) {
            console.error('Error sending trade command:', error);
            toast.error('Error sending trade command');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewOrder(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="container mx-auto p-4 bg-gray-900 text-white min-h-screen">
            <div className="bg-gray-800 shadow-lg rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-4 text-white">MT4 Web Terminal</h1>
                
                {/* Connection Status */}
                <div className="mb-4">
                    <span className="font-semibold">Status: </span>
                    <span className={`${connected ? 'text-green-400' : 'text-red-400'}`}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>

                {/* Account Information */}
                {accountData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-700 p-3 rounded">
                            <div className="text-sm text-gray-300">Balance</div>
                            <div className="font-semibold text-white">{accountData.balance?.toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded">
                            <div className="text-sm text-gray-300">Equity</div>
                            <div className="font-semibold text-white">{accountData.equity?.toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded">
                            <div className="text-sm text-gray-300">Margin</div>
                            <div className="font-semibold text-white">{accountData.margin?.toFixed(2)}</div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded">
                            <div className="text-sm text-gray-300">Free Margin</div>
                            <div className="font-semibold text-white">{accountData.freeMargin?.toFixed(2)}</div>
                        </div>
                    </div>
                )}

                {/* Trading Interface */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-white">New Order</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Symbol</label>
                                <input
                                    type="text"
                                    name="symbol"
                                    value={newOrder.symbol}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Lots</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="lots"
                                    value={newOrder.lots}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Stop Loss</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="stopLoss"
                                    value={newOrder.stopLoss}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Take Profit</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="takeProfit"
                                    value={newOrder.takeProfit}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Comment</label>
                                <input
                                    type="text"
                                    name="comment"
                                    value={newOrder.comment}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-700 text-white"
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => sendTradeCommand('buy')}
                                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                    disabled={!connected}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => sendTradeCommand('sell')}
                                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                    disabled={!connected}
                                >
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Open Positions */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-white">Open Positions</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ticket</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Lots</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-200">
                                    {positions.map((position) => (
                                        <tr key={position.ticket}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.ticket}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.symbol}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.lots}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.openPrice}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={position.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {position.profit.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => sendTradeCommand('close', position.ticket)}
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    Close
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebTerminal;
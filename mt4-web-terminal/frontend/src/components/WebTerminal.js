import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, X, DollarSign, Wallet, Activity, RefreshCw, BarChart2, Clock } from 'lucide-react';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);
    const [equityHistory, setEquityHistory] = useState([]);
    const [success, setSuccess] = useState(null);
    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0
    });
    const [lastUpdate, setLastUpdate] = useState(null);

    // WebSocket reference and reconnection settings
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000; // 2 seconds
    const reconnectBackoff = 1.5; // Exponential backoff multiplier

    // Format numbers with commas and 2 decimal places
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    // Format price with 5 decimal places
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
        }).format(price);
    };

    // Connect WebSocket function
    const connectWebSocket = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            ws.current = new WebSocket('wss://g1-back.onrender.com');

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setConnected(true);
                setError(null);
                reconnectAttempts.current = 0; // Reset reconnection attempts on successful connection
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket Disconnected', event.code, event.reason);
                setConnected(false);
                setEAConnected(false);

                // Only attempt to reconnect if we haven't exceeded max attempts
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(reconnectBackoff, reconnectAttempts.current);
                    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                    
                    setTimeout(() => {
                        reconnectAttempts.current++;
                        connectWebSocket();
                    }, delay);
                } else {
                    setError('Unable to establish connection. Please refresh the page.');
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setError('Connection error occurred');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received data:', data);
                    
                    if (data.type === 'update') {
                        setEAConnected(data.connected);
                        if (data.data) {
                            if (data.data.account) {
                                setAccountData({
                                    balance: parseFloat(data.data.account.balance || 0),
                                    equity: parseFloat(data.data.account.equity || 0),
                                    margin: parseFloat(data.data.account.margin || 0),
                                    freeMargin: parseFloat(data.data.account.freeMargin || 0)
                                });
                            }
                            if (data.data.positions) {
                                setPositions(data.data.positions);
                            }
                            if (data.data.equityHistory) {
                                setEquityHistory(data.data.equityHistory);
                            }
                            if (data.data.history) {
                                setLastUpdate(data.data);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            setError('Failed to create WebSocket connection');
        }
    }, []);

    // Initialize WebSocket connection
    useEffect(() => {
        ws.current = new WebSocket('wss://g1-back.onrender.com');

        ws.current.onopen = () => {
            console.log('WebSocket Connected');
            setConnected(true);
            setError(null);
        };

        ws.current.onclose = () => {
            console.log('WebSocket Disconnected');
            setConnected(false);
            setError('Connection lost. Reconnecting...');
            
            // Attempt to reconnect
            setTimeout(() => {
                if (ws.current?.readyState === WebSocket.CLOSED) {
                    console.log('Attempting to reconnect...');
                    ws.current = new WebSocket('wss://g1-back.onrender.com');
                }
            }, 5000);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setError('Connection error occurred');
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);

                if (data.type === 'update' || data.type === 'status') {
                    setEAConnected(data.connected);
                    if (data.data) {
                        if (data.data.account) {
                            setAccountData(data.data.account);
                        }
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
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleClosePosition = useCallback((ticket, percentage = 100) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }
        
        const command = percentage === 100 
            ? `CLOSE,${ticket}`
            : `CLOSE,${ticket},${percentage}`;
            
        console.log('Sending close command:', command);
        ws.current.send(JSON.stringify({
            type: 'command',
            data: command
        }));
    }, []);

    const handleModifyPosition = useCallback((ticket, sl, tp) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }
        
        console.log('Sending modify command:', `MODIFY,${ticket},${sl},${tp}`);
        ws.current.send(JSON.stringify({
            type: 'command',
            data: `MODIFY,${ticket},${sl},${tp}`
        }));
    }, []);

    const handleBreakeven = useCallback((ticket, pips = 0) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }
        
        console.log('Sending breakeven command:', `BREAKEVEN,${ticket},${pips}`);
        ws.current.send(JSON.stringify({
            type: 'command',
            data: `BREAKEVEN,${ticket},${pips}`
        }));
    }, []);

    // Handle trade execution
    const executeTrade = async (type) => {
        try {
            console.log('Executing trade:', { type, ...newOrder });
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'open',
                    symbol: newOrder.symbol,
                    type: type,
                    lots: parseFloat(newOrder.lots),
                    stopLoss: parseFloat(newOrder.stopLoss || 0),
                    takeProfit: parseFloat(newOrder.takeProfit || 0)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Trade response:', data);
            
            if (data.success) {
                setSuccess('Order executed successfully!');
                setError(null);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Failed to execute order');
            }
        } catch (error) {
            console.error('Trade error:', error);
            setError('Network error: ' + error.message);
        }
    };

    const handleCloseAll = async () => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'closeAll'
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('All positions closed successfully!');
                setError(null);
            } else {
                setError(data.error || 'Failed to close positions');
            }
        } catch (error) {
            console.error('Close all error:', error);
            setError('Network error: ' + error.message);
        }
    };

    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1a1f2e] p-3 rounded-lg border border-[#2a3441] shadow-lg">
                    <p className="text-gray-400 text-sm">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {entry.name}: ${formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const PositionActions = ({ position, onClose, onModify, onBreakeven }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [modalType, setModalType] = useState(null);
        const [percentage, setPercentage] = useState(50);
        const [stopLoss, setStopLoss] = useState(position.sl);
        const [takeProfit, setTakeProfit] = useState(position.tp);
        const [breakEvenPips, setBreakEvenPips] = useState(2);

        const handleAction = (action) => {
            setModalType(action);
            setIsModalOpen(true);
        };

        const handleSubmit = () => {
            switch(modalType) {
                case 'partial':
                    onClose(position.ticket, percentage);
                    break;
                case 'modify':
                    onModify(position.ticket, stopLoss, takeProfit);
                    break;
                case 'breakeven':
                    onBreakeven(position.ticket, breakEvenPips);
                    break;
            }
            setIsModalOpen(false);
        };

        return (
            <>
                <div className="flex space-x-2">
                    <button
                        onClick={() => onClose(position.ticket)}
                        className="px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => handleAction('partial')}
                        className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded hover:bg-orange-500/20"
                    >
                        Partial
                    </button>
                    <button
                        onClick={() => handleAction('modify')}
                        className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20"
                    >
                        Modify
                    </button>
                    <button
                        onClick={() => handleAction('breakeven')}
                        className="px-2 py-1 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"
                    >
                        BE
                    </button>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-[#1a1f2e] p-6 rounded-xl border border-[#2a3441] w-96">
                            <h3 className="text-lg font-bold mb-4">
                                {modalType === 'partial' && 'Close Partial Position'}
                                {modalType === 'modify' && 'Modify Position'}
                                {modalType === 'breakeven' && 'Set Breakeven'}
                            </h3>

                            <div className="space-y-4">
                                {modalType === 'partial' && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            Close Percentage
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="99"
                                            value={percentage}
                                            onChange={(e) => setPercentage(Number(e.target.value))}
                                            className="w-full"
                                        />
                                        <div className="text-center mt-2">{percentage}%</div>
                                    </div>
                                )}

                                {modalType === 'modify' && (
                                    <>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">
                                                Stop Loss
                                            </label>
                                            <input
                                                type="number"
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(Number(e.target.value))}
                                                className="w-full bg-[#2a3441] p-2 rounded"
                                                step="0.00001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">
                                                Take Profit
                                            </label>
                                            <input
                                                type="number"
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(Number(e.target.value))}
                                                className="w-full bg-[#2a3441] p-2 rounded"
                                                step="0.00001"
                                            />
                                        </div>
                                    </>
                                )}

                                {modalType === 'breakeven' && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            Pips Buffer
                                        </label>
                                        <input
                                            type="number"
                                            value={breakEvenPips}
                                            onChange={(e) => setBreakEvenPips(Number(e.target.value))}
                                            className="w-full bg-[#2a3441] p-2 rounded"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-4 mt-6">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-500/10 text-gray-400 rounded hover:bg-gray-500/20"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    const TradeHistory = () => {
        const [history, setHistory] = useState([]);
        const [period, setPeriod] = useState('today');
        const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [sortField, setSortField] = useState('closeTime');
        const [sortDirection, setSortDirection] = useState('desc');
        const ws = useRef(null);

        useEffect(() => {
            // Connect to WebSocket if not already connected
            if (!ws.current) {
                ws.current = new WebSocket('wss://g1-back.onrender.com');
                
                ws.current.onopen = () => {
                    console.log('WebSocket connected');
                };
                
                ws.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('Received WebSocket message:', message);
                        if (message.type === 'tradeHistory') {
                            setHistory(message.data);
                            setLoading(false);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                        setError('Failed to parse history data');
                        setLoading(false);
                    }
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setError('WebSocket connection error');
                    setLoading(false);
                };
            }

            return () => {
                if (ws.current) {
                    ws.current.close();
                }
            };
        }, []);
        
        const syncHistory = () => {
            setLoading(true);
            setError('');
            
            try {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    const command = period === 'custom'
                        ? `GET_HISTORY|${period}|${customRange.startDate}|${customRange.endDate}`
                        : `GET_HISTORY|${period}`;
                    
                    console.log('Sending history request:', command);
                    ws.current.send(JSON.stringify({
                        type: 'command',
                        command: command
                    }));
                } else {
                    setError('WebSocket not connected. Please try again.');
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error sending history request:', error);
                setError('Failed to request trade history');
                setLoading(false);
            }
        };

        const sortedHistory = useMemo(() => {
            return [...history].sort((a, b) => {
                if (sortField === 'closeTime') {
                    return sortDirection === 'desc' 
                        ? new Date(b.closeTime) - new Date(a.closeTime)
                        : new Date(a.closeTime) - new Date(b.closeTime);
                }
                return sortDirection === 'desc' 
                    ? b[sortField] - a[sortField]
                    : a[sortField] - b[sortField];
            });
        }, [history, sortField, sortDirection]);

        const handleSort = (field) => {
            if (field === sortField) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                setSortField(field);
                setSortDirection('desc');
            }
        };

        const formatDateTime = (dateStr) => {
            return new Date(dateStr).toLocaleString();
        };

        const getOrderTypeString = (type) => {
            switch(type) {
                case 0: return 'Buy';
                case 1: return 'Sell';
                case 2: return 'Buy Limit';
                case 3: return 'Sell Limit';
                case 4: return 'Buy Stop';
                case 5: return 'Sell Stop';
                default: return 'Unknown';
            }
        };

        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-4">
                    <select 
                        className="bg-[#1a1f2e] text-white border border-[#2a3441] rounded px-3 py-2"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="all">All History</option>
                        <option value="today">Today</option>
                        <option value="last3days">Last 3 Days</option>
                        <option value="lastWeek">Last Week</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="last3Months">Last 3 Months</option>
                        <option value="last6Months">Last 6 Months</option>
                        <option value="custom">Custom Period</option>
                    </select>

                    {period === 'custom' && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="date"
                                className="bg-[#1a1f2e] text-white border border-[#2a3441] rounded px-3 py-2"
                                value={customRange.startDate}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                            <span className="text-white">to</span>
                            <input
                                type="date"
                                className="bg-[#1a1f2e] text-white border border-[#2a3441] rounded px-3 py-2"
                                value={customRange.endDate}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    )}

                    <button
                        onClick={syncHistory}
                        disabled={loading || (period === 'custom' && (!customRange.startDate || !customRange.endDate))}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2"
                    >
                        {loading ? (
                            <span className="animate-spin">⟳</span>
                        ) : (
                            <span>Sync History</span>
                        )}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('ticket')}>
                                    Ticket
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Symbol
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('lots')}>
                                    Volume
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('openPrice')}>
                                    Open Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('closePrice')}>
                                    Close Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('closeTime')}>
                                    Close Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('profit')}>
                                    Profit
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Commission
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Swap
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                                    onClick={() => handleSort('total')}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {sortedHistory.map((trade) => (
                                <tr key={`${trade.ticket}-${trade.closeTime}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.ticket}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.symbol}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {getOrderTypeString(trade.type)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.lots.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.openPrice.toFixed(5)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.closePrice.toFixed(5)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {formatDateTime(trade.closeTime)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.profit.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.commission.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {trade.swap.toFixed(2)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${trade.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Web Terminal
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time Trading Interface</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${eaConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${eaConnected ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>
                        {eaConnected ? 'EA Connected' : 'EA Disconnected'}
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
                {/* Trading Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* New Order Form */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-4">New Order</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Symbol</label>
                                <input
                                    type="text"
                                    value={newOrder.symbol}
                                    onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                                    className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                             focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                    placeholder="Enter symbol"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Lots</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newOrder.lots}
                                    onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                    className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                             focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                    placeholder="Enter lots"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Stop Loss</label>
                                    <input
                                        type="number"
                                        value={newOrder.stopLoss}
                                        onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                        className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                                 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                        placeholder="Stop Loss"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Take Profit</label>
                                    <input
                                        type="number"
                                        value={newOrder.takeProfit}
                                        onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                        className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                                 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                        placeholder="Take Profit"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={() => executeTrade(0)}
                                    className="h-10 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Buy
                                </button>
                                <button
                                    onClick={() => executeTrade(1)}
                                    className="h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    <TrendingDown className="w-4 h-4" />
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Account Overview */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-4">Account Overview</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Balance', value: accountData?.balance || 0, Icon: Wallet, color: 'text-blue-500' },
                                { label: 'Equity', value: accountData?.equity || 0, Icon: DollarSign, color: 'text-emerald-500' },
                                { label: 'Margin', value: accountData?.margin || 0, Icon: Activity, color: 'text-purple-500' },
                                { label: 'Free Margin', value: accountData?.freeMargin || 0, Icon: BarChart2, color: 'text-amber-500' }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg bg-opacity-10 ${item.color}`}>
                                            <item.Icon className={`w-4 h-4 ${item.color}`} />
                                        </div>
                                        <span className="text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="font-semibold">${formatCurrency(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Market Status */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Market Status</h3>
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                <span className="text-gray-400">Server Time</span>
                                <span className="font-semibold">
                                    {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                <span className="text-gray-400">Trading Session</span>
                                <span className="text-green-400 font-semibold">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart and Positions */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Chart Section */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Price Chart</h2>
                                <p className="text-sm text-gray-400">Real-time market visualization</p>
                            </div>
                            <div className="flex space-x-4">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-sm text-gray-400">Price</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                                    <span className="text-sm text-gray-400">Volume</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={equityHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis 
                                        dataKey="time" 
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280' }}
                                    />
                                    <YAxis 
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280' }}
                                        tickFormatter={(value) => `$${formatCurrency(value)}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Open Positions</h2>
                                <p className="text-sm text-gray-400">Manage your active trades</p>
                            </div>
                            <button
                                onClick={handleCloseAll}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                                         flex items-center gap-2 transition-all"
                            >
                                <X className="w-4 h-4" />
                                Close All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-gray-400">
                                        <th className="p-4">Ticket</th>
                                        <th className="p-4">Symbol</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Lots</th>
                                        <th className="p-4">Open Price</th>
                                        <th className="p-4">S/L</th>
                                        <th className="p-4">T/P</th>
                                        <th className="p-4">Profit</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.ticket} className="border-t border-[#2a3441]">
                                            <td className="p-4">{position.ticket}</td>
                                            <td className="p-4">{position.symbol}</td>
                                            <td className="p-4">
                                                <span className={position.type === 0 ? 'text-green-500' : 'text-red-500'}>
                                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="p-4">{position.lots}</td>
                                            <td className="p-4">{position.openPrice}</td>
                                            <td className="p-4">{position.sl}</td>
                                            <td className="p-4">{position.tp}</td>
                                            <td className={`p-4 ${position.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {formatCurrency(position.profit)}
                                            </td>
                                            <td className="p-4">
                                                <PositionActions
                                                    position={position}
                                                    onClose={handleClosePosition}
                                                    onModify={handleModifyPosition}
                                                    onBreakeven={handleBreakeven}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Trade History */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Trade History</h2>
                                <p className="text-sm text-gray-400">View your past trades</p>
                            </div>
                        </div>
                        <TradeHistory />
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mt-4 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 p-4 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                    {success}
                </div>
            )}
        </div>
    );
};

export default WebTerminal;
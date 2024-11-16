import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Wallet, Activity, RefreshCw, BarChart2, Clock, 
         ArrowUpCircle, ArrowDownCircle, CheckCircle2, AlertCircle, Settings, Save, LayoutGrid, 
         RotateCcw, Package } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import ThemeCustomizer from './ThemeCustomizer';
import { CustomLayout } from './CustomLayout';
import { Dialog } from './Dialog';

// Layout presets with fixed dimensions and positions
const LAYOUT_PRESETS = {
    default: {
        description: 'Standard layout with full-width panels',
        layout: [
            { i: 'account', x: 0, y: 0, w: 12, h: 4 },
            { i: 'positions', x: 0, y: 4, w: 12, h: 8 },
            { i: 'orders', x: 0, y: 12, w: 12, h: 8 }
        ]
    },
    compact: {
        description: 'Compact layout with side-by-side panels',
        layout: [
            { i: 'account', x: 0, y: 0, w: 12, h: 4 },
            { i: 'positions', x: 0, y: 4, w: 6, h: 8 },
            { i: 'orders', x: 6, y: 4, w: 6, h: 8 }
        ]
    },
    wide: {
        description: 'Wide layout with emphasis on trading panels',
        layout: [
            { i: 'account', x: 0, y: 0, w: 12, h: 4 },
            { i: 'positions', x: 0, y: 4, w: 8, h: 8 },
            { i: 'orders', x: 8, y: 4, w: 4, h: 8 }
        ]
    }
};

const WebTerminal = () => {
    const [accountData, setAccountData] = useState({
        balance: null,
        equity: null,
        margin: null,
        freeMargin: null
    });
    const [positions, setPositions] = useState([]);
    const [serverConnected, setServerConnected] = useState(false);
    const [eaConnected, setEaConnected] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Load saved layout on component mount
    const [layoutState, setLayoutState] = useState(() => {
        try {
            const savedPreset = localStorage.getItem('selectedPreset') || 'default';
            const savedLayoutString = localStorage.getItem('layoutSettings');
            const savedLayout = savedLayoutString ? JSON.parse(savedLayoutString) : LAYOUT_PRESETS[savedPreset].layout;

            // Validate saved layout
            if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
                throw new Error('Invalid saved layout');
            }

            return {
                selectedPreset: savedPreset,
                currentLayout: savedLayout,
                previewLayout: null
            };
        } catch (error) {
            console.error('Error loading saved layout:', error);
            return {
                selectedPreset: 'default',
                currentLayout: LAYOUT_PRESETS.default.layout,
                previewLayout: null
            };
        }
    });

    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0
    });

    const [lastUpdate, setLastUpdate] = useState(null);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    // Handle selecting a preset
    const handlePresetSelect = (preset) => {
        if (!LAYOUT_PRESETS[preset]) {
            console.error('Invalid preset selected:', preset);
            return;
        }

        const newLayout = [...LAYOUT_PRESETS[preset].layout];
        setLayoutState(prev => ({
            ...prev,
            selectedPreset: preset,
            previewLayout: newLayout
        }));
        setIsEditing(true);
    };

    // Handle layout changes during editing
    const handleLayoutChange = (newLayout) => {
        if (!isEditing || !Array.isArray(newLayout)) return;

        const updatedLayout = newLayout.map(item => ({
            i: item.i || '',
            x: parseInt(item.x) || 0,
            y: parseInt(item.y) || 0,
            w: parseInt(item.w) || 1,
            h: parseInt(item.h) || 1
        }));

        setLayoutState(prev => ({
            ...prev,
            previewLayout: updatedLayout
        }));
    };

    // Save layout changes
    const saveLayout = () => {
        try {
            const layoutToSave = layoutState.previewLayout || layoutState.currentLayout;
            if (!layoutToSave || !Array.isArray(layoutToSave)) {
                throw new Error('Invalid layout data');
            }

            // Validate and clean layout data
            const validatedLayout = layoutToSave.map(item => ({
                i: String(item.i || ''),
                x: parseInt(item.x) || 0,
                y: parseInt(item.y) || 0,
                w: parseInt(item.w) || 1,
                h: parseInt(item.h) || 1
            }));

            // Save to localStorage
            localStorage.setItem('selectedPreset', layoutState.selectedPreset);
            localStorage.setItem('layoutSettings', JSON.stringify(validatedLayout));

            // Update state
            setLayoutState({
                selectedPreset: layoutState.selectedPreset,
                currentLayout: validatedLayout,
                previewLayout: null
            });

            setIsEditing(false);
            setShowSettings(false);
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    // Reset to default layout
    const resetLayout = () => {
        try {
            const defaultLayout = [...LAYOUT_PRESETS.default.layout];
            
            localStorage.setItem('selectedPreset', 'default');
            localStorage.setItem('layoutSettings', JSON.stringify(defaultLayout));
            
            setLayoutState({
                selectedPreset: 'default',
                currentLayout: defaultLayout,
                previewLayout: null
            });
            
            setIsEditing(false);
            setShowSettings(false);
        } catch (error) {
            console.error('Error resetting layout:', error);
        }
    };

    // Handle settings panel close
    const handleSettingsClose = () => {
        setLayoutState(prev => ({
            ...prev,
            previewLayout: null
        }));
        setIsEditing(false);
        setShowSettings(false);
    };

    // WebSocket reference and reconnection settings
    const ws = React.useRef(null);
    const reconnectAttempts = React.useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000; // 2 seconds
    const reconnectBackoff = 1.5; // Exponential backoff multiplier

    // WebSocket connection handler
    const connectWebSocket = useCallback(() => {
        try {
            ws.current = new WebSocket('wss://g1-back.onrender.com');

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setServerConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.current.onclose = () => {
                console.log('WebSocket Disconnected');
                setServerConnected(false);
                setEaConnected(false);
                setError('Connection lost. Attempting to reconnect...');
                
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(reconnectBackoff, reconnectAttempts.current);
                    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                    setTimeout(connectWebSocket, delay);
                    reconnectAttempts.current++;
                } else {
                    setError('Maximum reconnection attempts reached. Please refresh the page.');
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setError('Connection error occurred');
            };

            ws.current.onmessage = handleMessage;
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            setError('Failed to create WebSocket connection');
            setServerConnected(false);
            setEaConnected(false);
        }
    }, []);

    // Parse positions from string format
    const parsePositions = useCallback((positionsStr) => {
        try {
            // Split the positions string by semicolon to get individual position strings
            const positions = positionsStr.split(';').map(pos => {
                // Split each position string by comma
                const [ticket, symbol, type, volume, openPrice, sl, tp, profit] = pos.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type: parseInt(type),
                    volume: parseFloat(volume),
                    openPrice: parseFloat(openPrice),
                    sl: parseFloat(sl),
                    tp: parseFloat(tp),
                    profit: parseFloat(profit)
                };
            });
            return positions;
        } catch (error) {
            console.error('Error parsing positions:', error);
            return [];
        }
    }, []);

    // WebSocket message handler
    const handleMessage = useCallback((event) => {
        try {
            let data;
            if (typeof event.data === 'string') {
                // Check if it's a pipe-delimited message
                if (event.data.includes('|')) {
                    const [type, ...parts] = event.data.split('|');
                    if (type === 'POSITIONS') {
                        const positions = parsePositions(parts.join('|'));
                        console.log('Parsed positions from pipe format:', positions);
                        const formattedPositions = positions.map(position => ({
                            ...position,
                            type: position.type === 0 ? 'Buy' : 'Sell',
                            volume: position.volume.toFixed(2),
                            profit: position.profit.toFixed(2)
                        }));
                        setPositions(formattedPositions);
                        setEaConnected(true);
                        return;
                    }
                }
                data = JSON.parse(event.data);
            } else {
                data = JSON.parse(event.data);
            }
            
            console.log('Received WebSocket message:', data);
            
            if (data.type === 'connection_status') {
                setServerConnected(true);
                if (data.connected !== undefined) {
                    setEaConnected(!!data.connected);
                }
                return;
            }

            if (data.type === 'update') {
                if (data.data) {
                    if (data.data.connected !== undefined) {
                        setEaConnected(!!data.data.connected);
                    }

                    if (data.data.account) {
                        // Only update if we receive valid non-zero values
                        setAccountData(prevData => ({
                            balance: parseFloat(data.data.account.balance) || prevData.balance || 0,
                            equity: parseFloat(data.data.account.equity) || prevData.equity || 0,
                            margin: parseFloat(data.data.account.margin) || prevData.margin || 0,
                            freeMargin: parseFloat(data.data.account.freeMargin) || prevData.freeMargin || 0
                        }));
                    }

                    if (Array.isArray(data.data.positions)) {
                        console.log('Processing positions from update:', data.data.positions);
                        const formattedPositions = data.data.positions.map(position => {
                            console.log('Processing position:', position);
                            const volume = parseFloat(position.volume || position.lots || 0);
                            console.log('Parsed volume:', volume);
                            return {
                                ...position,
                                type: position.type === 0 ? 'Buy' : 'Sell',
                                volume: volume.toFixed(2),
                                profit: parseFloat(position.profit || 0).toFixed(2)
                            };
                        });
                        console.log('Formatted positions:', formattedPositions);
                        setPositions(formattedPositions);
                        setEaConnected(true);
                    }
                }
                setLastUpdate(new Date());
            }

            if (data.type === 'positions') {
                console.log('Processing direct positions message:', data.data);
                const formattedPositions = data.data.map(position => {
                    console.log('Processing position:', position);
                    const volume = parseFloat(position.volume || position.lots || 0);
                    console.log('Parsed volume:', volume);
                    return {
                        ...position,
                        type: position.type === 0 ? 'Buy' : 'Sell',
                        volume: volume.toFixed(2),
                        profit: parseFloat(position.profit || 0).toFixed(2)
                    };
                });
                console.log('Formatted positions:', formattedPositions);
                setPositions(formattedPositions);
                setEaConnected(true);
            }

            if (data.type === 'history_response' || data.type === 'history_data') {
                setHistoryLoading(false);
                setHistoryError('');
                setTradeHistory(data.data);
            }

            if (data.type === 'error') {
                console.error('Server error:', data.error);
                setError(data.error);
                setHistoryLoading(false);
                if (data.error.includes('history')) {
                    setHistoryError(data.error);
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            console.error('Raw message data:', event.data);
            setError('Failed to process server response');
            setHistoryLoading(false);
        }
    }, []);

    // Initialize WebSocket connection
    useEffect(() => {
        connectWebSocket();
        
        // Request initial status and positions
        const requestInitialData = () => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                console.log('Requesting status and positions...');
                ws.current.send(JSON.stringify({ command: 'GET_STATUS' }));
                ws.current.send(JSON.stringify({ command: 'GET_POSITIONS' }));
            }
        };

        // Initial request
        requestInitialData();

        // Poll for updates every 5 seconds
        const updateInterval = setInterval(requestInitialData, 5000);
        
        // Cleanup on unmount
        return () => {
            clearInterval(updateInterval);
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connectWebSocket]);

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
    const handleClosePosition = useCallback((ticket, percentage = 100) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            setError('Not connected to server');
            return;
        }

        try {
            const command = {
                type: 'command',
                command: 'Close',
                data: `${ticket},${percentage}`,
                timestamp: Date.now()
            };

            console.log('Sending close command:', command);
            ws.current.send(JSON.stringify(command));
            
            setSuccess('Close command sent successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Close position error:', error);
            setError(error.message);
        }
    }, []);

    const handleBreakeven = useCallback((ticket) => {
        if (!ws.current || !eaConnected) return;
        
        try {
            ws.current.send(JSON.stringify({
                command: 'BE',
                data: { ticket },
                timestamp: Date.now()
            }));
            
            setSuccess('Breakeven command sent successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Breakeven error:', error);
            setError(error.message);
        }
    }, [eaConnected]);

    const handleModify = useCallback((ticket, sl, tp) => {
        if (!ws.current || !eaConnected) return;
        
        try {
            ws.current.send(JSON.stringify({
                command: 'Modify',
                data: { ticket, sl, tp },
                timestamp: Date.now()
            }));
            
            setSuccess('Modify command sent successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Modify error:', error);
            setError(error.message);
        }
    }, [eaConnected]);

    const handleCloseAll = useCallback(() => {
        if (!ws.current || !eaConnected) return;
        
        try {
            ws.current.send(JSON.stringify({
                command: 'CloseAll',
                timestamp: Date.now()
            }));
            
            setSuccess('Close all command sent successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Close all error:', error);
            setError(error.message);
        }
    }, [eaConnected]);

    // Handle trade execution with optimistic updates
    const executeTrade = async (type) => {
        try {
            if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
                setError('Not connected to server');
                return;
            }

            // Keep current account data for optimistic update
            const currentAccountData = { ...accountData };

            // Format trade command according to EA expectations: BUY/SELL,symbol,lots,sl,tp
            const tradeAction = type === 0 ? 'BUY' : 'SELL';
            const tradeData = `${tradeAction},${newOrder.symbol},${newOrder.lots},${newOrder.stopLoss || 0},${newOrder.takeProfit || 0}`;

            const command = {
                type: 'command',
                command: 'Trade',
                data: tradeData,
                timestamp: Date.now()
            };

            console.log('Sending trade command:', command);
            ws.current.send(JSON.stringify(command));
            
            // Show success message
            setSuccess('Trade command sent successfully');
            setTimeout(() => setSuccess(null), 3000);

            // Request immediate update
            ws.current.send(JSON.stringify({ command: 'GET_STATUS' }));
            ws.current.send(JSON.stringify({ command: 'GET_POSITIONS' }));

        } catch (error) {
            console.error('Trade execution error:', error);
            setError(error.message);
        }
    };

    const syncHistory = (period, customRange = null) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            setError('Not connected to server. Attempting to reconnect...');
            connectWebSocket();
            return;
        }

        setHistoryLoading(true);
        setHistoryError('');
        setError('');
        
        try {
            const requestId = Date.now().toString();
            const command = {
                type: 'command',
                id: requestId,
                command: customRange
                    ? `GET_HISTORY|custom|${customRange.startDate}|${customRange.endDate}`
                    : `GET_HISTORY|${period}`,
                timestamp: Date.now()
            };
            
            console.log('Sending history request:', command);
            ws.current.send(JSON.stringify(command));
            
            // Set a timeout for the request
            setTimeout(() => {
                if (historyLoading) {
                    setHistoryLoading(false);
                    setHistoryError('Request timed out. Please try again.');
                }
            }, 30000);
        } catch (error) {
            console.error('Error sending history request:', error);
            setHistoryError('Failed to send request: ' + error.message);
            setHistoryLoading(false);
        }
    };

    const TradeHistory = () => {
        const [period, setPeriod] = useState('today');
        const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
        const [sortField, setSortField] = useState('closeTime');
        const [sortDirection, setSortDirection] = useState('desc');

        const sortedHistory = React.useMemo(() => {
            return [...tradeHistory].sort((a, b) => {
                if (sortField === 'closeTime') {
                    return sortDirection === 'desc' 
                        ? new Date(b.closeTime) - new Date(a.closeTime)
                        : new Date(a.closeTime) - new Date(b.closeTime);
                }
                return sortDirection === 'desc' 
                    ? b[sortField] - a[sortField]
                    : a[sortField] - b[sortField];
            });
        }, [tradeHistory, sortField, sortDirection]);

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
                        onClick={() => syncHistory(period, period === 'custom' ? customRange : null)}
                        disabled={historyLoading || (period === 'custom' && (!customRange.startDate || !customRange.endDate))}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                        {historyLoading ? (
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
                            {sortedHistory.map((trade) => {
                                const total = (trade.profit || 0) + (trade.commission || 0) + (trade.swap || 0);
                                return (
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
                                            {(trade.lots || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {(trade.openPrice || 0).toFixed(5)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {(trade.closePrice || 0).toFixed(5)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {formatDateTime(trade.closeTime)}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${trade.profit >= 0 ? 'text-magic-success' : 'text-magic-error'}`}>
                                            {(trade.profit || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {(trade.commission || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {(trade.swap || 0).toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${total >= 0 ? 'text-magic-success' : 'text-magic-error'}`}>
                                            {total.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
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
                        className="px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 flex items-center gap-1"
                        title="Close Position"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAction('partial')}
                        className="px-2 py-1 bg-magic-hover rounded hover:bg-magic-hover/80 flex items-center gap-1"
                        title="Partial Close"
                    >
                        <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAction('modify')}
                        className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 flex items-center gap-1"
                        title="Modify Position"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAction('breakeven')}
                        className="px-2 py-1 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 flex items-center gap-1"
                        title="Break Even"
                    >
                        <BarChart2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
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

    const Position = ({ position, onClose }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [modalType, setModalType] = useState(null);
        const [percentage, setPercentage] = useState(50);
        const [stopLoss, setStopLoss] = useState(position.sl || 0);
        const [takeProfit, setTakeProfit] = useState(position.tp || 0);
        const [breakEvenPips, setBreakEvenPips] = useState(1);

        const handleAction = (type) => {
            setModalType(type);
            setIsModalOpen(true);
        };

        const handleClose = useCallback(() => {
            if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
                console.error('WebSocket not connected');
                setError('Connection error. Please try again.');
                return;
            }

            try {
                const command = {
                    type: 'command',
                    command: 'Close',
                    data: `${position.ticket},100`,
                    timestamp: Date.now()
                };

                ws.current.send(JSON.stringify(command));
                setSuccess('Close command sent successfully');
                setTimeout(() => setSuccess(null), 3000);
            } catch (error) {
                console.error('Error sending close command:', error);
                setError(error.message);
            }
        }, [position.ticket]);

        const handleSubmit = () => {
            if (!ws.current) return;

            try {
                let command;
                switch (modalType) {
                    case 'partial':
                        command = {
                            type: 'command',
                            command: 'Close',
                            data: `${position.ticket},${percentage}`,
                            timestamp: Date.now()
                        };
                        break;
                    case 'modify':
                        command = {
                            type: 'command',
                            command: 'Modify',
                            data: `${position.ticket},${stopLoss},${takeProfit}`,
                            timestamp: Date.now()
                        };
                        break;
                    case 'breakeven':
                        command = {
                            type: 'command',
                            command: 'BE',
                            data: `${position.ticket},${breakEvenPips}`,
                            timestamp: Date.now()
                        };
                        break;
                }

                if (command) {
                    ws.current.send(JSON.stringify(command));
                    setSuccess(`${modalType} command sent successfully`);
                    setTimeout(() => setSuccess(null), 3000);
                }
            } catch (error) {
                console.error(`Error sending ${modalType} command:`, error);
                setError(error.message);
            }

            setIsModalOpen(false);
        };

        return (
            <>
                <div className="p-4 bg-magic-hover/50 rounded-lg border border-magic-border">
                    <div className="flex flex-col space-y-3">
                        {/* Symbol and Type Row */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg font-medium">{position.symbol}</span>
                                <span className={`px-2 py-0.5 rounded text-sm ${position.type === 0 ? 'bg-magic-success/10 text-magic-success' : 'bg-magic-error/10 text-magic-error'}`}>
                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                </span>
                            </div>
                            <div className={`text-lg font-medium ${parseFloat(position.profit) >= 0 ? 'text-magic-success' : 'text-magic-error'}`}>
                                {parseFloat(position.profit) >= 0 ? '+' : ''}{formatCurrency(position.profit)}
                            </div>
                        </div>
                        
                        {/* Trade Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-magic-muted">Volume</div>
                                <div className="font-medium">{parseFloat(position.volume).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-magic-muted">Entry</div>
                                <div className="font-medium">{formatPrice(position.openPrice)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-magic-muted">S/L</div>
                                <div className="font-medium">{position.sl ? formatPrice(position.sl) : '—'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-magic-muted">T/P</div>
                                <div className="font-medium">{position.tp ? formatPrice(position.tp) : '—'}</div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={handleClose}
                                className="px-2 py-1 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 flex items-center gap-1"
                                title="Close Position"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleAction('partial')}
                                className="px-2 py-1 bg-magic-hover rounded hover:bg-magic-hover/80 flex items-center gap-1"
                                title="Partial Close"
                            >
                                <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleAction('modify')}
                                className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 flex items-center gap-1"
                                title="Modify Position"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleAction('breakeven')}
                                className="px-2 py-1 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 flex items-center gap-1"
                                title="Break Even"
                            >
                                <BarChart2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="min-h-screen bg-magic-background text-magic-foreground">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-magic-background/95 backdrop-blur-sm border-b border-magic-border">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">MT4 Web Terminal</h1>
                        <div className="flex items-center space-x-3">
                            <ThemeCustomizer />
                            <ThemeToggle />
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 hover:bg-magic-hover rounded-lg transition-colors"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-4">
                {/* Connection Status Dashboard */}
                <div className="flex items-center gap-4 px-4 py-2 bg-magic-card border-b border-magic-border">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${serverConnected ? 'bg-magic-success' : 'bg-magic-error'}`} />
                        <span className="text-sm font-medium">Server: {serverConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${eaConnected ? 'bg-magic-success' : 'bg-magic-error'}`} />
                        <span className="text-sm font-medium">EA: {eaConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                <CustomLayout
                    layout={layoutState.previewLayout || layoutState.currentLayout}
                    isEditing={isEditing}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".panel-header"
                    cols={12}
                    rowHeight={60}
                    margin={[16, 16]}
                    containerPadding={[16, 16]}
                >
                    {/* Account Info */}
                    <div key="account" className="bg-magic-card rounded-lg border border-magic-border overflow-hidden h-full">
                        <div className="p-3 sm:p-4 bg-magic-hover/50 border-b border-magic-border pb-4 panel-header cursor-move">
                            <h2 className="text-lg sm:text-xl font-semibold">Account Information</h2>
                        </div>
                        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                {accountData && Object.entries(accountData).map(([key, value]) => (
                                    <div key={key} className="p-3 sm:p-4 rounded-lg bg-magic-hover/50 border border-magic-border transition-all hover:border-magic-border-hover">
                                        <div className="flex items-center space-x-2 mb-1.5 sm:mb-2">
                                            {key === 'balance' && <Wallet className="w-4 h-4 text-magic-primary" />}
                                            {key === 'equity' && <Activity className="w-4 h-4 text-magic-success" />}
                                            {key === 'margin' && <DollarSign className="w-4 h-4 text-magic-warning" />}
                                            {key === 'freeMargin' && <RefreshCw className="w-4 h-4 text-magic-info" />}
                                            <span className="text-magic-muted text-xs sm:text-sm font-medium">
                                                {key.replace(/([A-Z])/g, ' $1').trim().charAt(0).toUpperCase() + 
                                                 key.replace(/([A-Z])/g, ' $1').trim().slice(1)}
                                            </span>
                                        </div>
                                        <div className="text-xl sm:text-2xl font-semibold tracking-tight">
                                            {formatCurrency(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Positions */}
                    <div key="positions" className="bg-magic-card rounded-lg border border-magic-border overflow-hidden h-full">
                        <div className="p-3 sm:p-4 bg-magic-hover/50 border-b border-magic-border panel-header cursor-move flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-semibold">Open Trades</h2>
                            {positions.length > 0 && eaConnected && (
                                <button
                                    onClick={handleCloseAll}
                                    className="px-3 py-1 text-sm bg-magic-error/10 text-magic-error rounded hover:bg-magic-error/20 transition-all"
                                >
                                    Close All
                                </button>
                            )}
                        </div>
                        <div className="p-3 sm:p-4 overflow-y-auto">
                            {!serverConnected ? (
                                <div className="text-center text-magic-muted py-8">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Server Disconnected</p>
                                    <p className="text-sm mt-1">Please wait while we reconnect...</p>
                                </div>
                            ) : !eaConnected ? (
                                <div className="text-center text-magic-muted py-8">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>EA Disconnected</p>
                                    <p className="text-sm mt-1">Connect EA to view open trades</p>
                                </div>
                            ) : positions.length === 0 ? (
                                <div className="text-center text-magic-muted py-8">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No Open Trades</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {positions.map((position) => (
                                        <Position
                                            key={position.ticket}
                                            position={position}
                                            onClose={handleClosePosition}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Orders */}
                    <div key="orders" className="bg-magic-card rounded-lg border border-magic-border overflow-hidden h-full">
                        <div className="p-3 sm:p-4 bg-magic-hover/50 border-b border-magic-border panel-header cursor-move">
                            <h2 className="text-lg sm:text-xl font-semibold">New Order</h2>
                        </div>
                        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-3 sm:space-y-4">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-magic-muted mb-1 sm:mb-1.5">
                                            Symbol
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrder.symbol}
                                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                                            className="w-full h-9 sm:h-10 md:h-11 bg-magic-card border border-magic-border rounded-lg px-3 sm:px-4 
                                                     text-sm sm:text-base focus:ring-2 focus:ring-magic-primary/40 focus:border-magic-primary/40 
                                                     transition-all hover:border-magic-border-hover"
                                            placeholder="Enter symbol"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-magic-muted mb-1 sm:mb-1.5">
                                            Lots
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newOrder.lots}
                                            onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                            className="w-full h-9 sm:h-10 md:h-11 bg-magic-card border border-magic-border rounded-lg px-3 sm:px-4 
                                                     text-sm sm:text-base focus:ring-2 focus:ring-magic-primary/40 focus:border-magic-primary/40 
                                                     transition-all hover:border-magic-border-hover"
                                            placeholder="Enter lots"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3 sm:space-y-4">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-magic-muted mb-1 sm:mb-1.5">
                                            Stop Loss
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrder.stopLoss}
                                            onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                            className="w-full h-9 sm:h-10 md:h-11 bg-magic-card border border-magic-border rounded-lg px-3 sm:px-4 
                                                     text-sm sm:text-base focus:ring-2 focus:ring-magic-primary/40 focus:border-magic-primary/40 
                                                     transition-all hover:border-magic-border-hover"
                                            placeholder="Stop Loss"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-magic-muted mb-1 sm:mb-1.5">
                                            Take Profit
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrder.takeProfit}
                                            onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                            className="w-full h-9 sm:h-10 md:h-11 bg-magic-card border border-magic-border rounded-lg px-3 sm:px-4 
                                                     text-sm sm:text-base focus:ring-2 focus:ring-magic-primary/40 focus:border-magic-primary/40 
                                                     transition-all hover:border-magic-border-hover"
                                            placeholder="Take Profit"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                                <button
                                    onClick={() => executeTrade(0)}
                                    className="h-9 sm:h-10 md:h-12 bg-magic-success/10 hover:bg-magic-success/20 text-magic-success rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all border border-magic-success/20
                                             hover:border-magic-success/40"
                                >
                                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-sm sm:text-base">Buy Market</span>
                                </button>
                                <button
                                    onClick={() => executeTrade(1)}
                                    className="h-9 sm:h-10 md:h-12 bg-magic-error/10 hover:bg-magic-error/20 text-magic-error rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all border border-magic-error/20
                                             hover:border-magic-error/40"
                                >
                                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-sm sm:text-base">Sell Market</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </CustomLayout>
            </div>

            {/* Settings Panel */}
            <Dialog
                open={showSettings}
                onClose={handleSettingsClose}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-2xl bg-magic-card rounded-xl shadow-lg">
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-center border-b border-magic-border pb-4">
                                <Dialog.Title className="text-xl font-semibold">
                                    Terminal Settings
                                </Dialog.Title>
                                <button
                                    onClick={handleSettingsClose}
                                    className="p-2 rounded-lg hover:bg-magic-hover text-magic-muted transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Layout Presets */}
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium">Layout Presets</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(LAYOUT_PRESETS).map(([preset, config]) => (
                                        <button
                                            key={preset}
                                            onClick={() => handlePresetSelect(preset)}
                                            className={`flex flex-col p-4 rounded-lg border-2 transition-all ${
                                                layoutState.selectedPreset === preset
                                                    ? 'border-magic-primary bg-magic-primary/10'
                                                    : 'border-magic-border hover:border-magic-border-hover'
                                            }`}
                                        >
                                            <span className="font-medium capitalize mb-1">
                                                {preset} Layout
                                            </span>
                                            <span className="text-sm text-magic-muted mt-1">{config.description}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Layout Section */}
                                <div className="pt-4 border-t border-magic-border">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium">Custom Layout</h3>
                                            <p className="text-sm text-magic-muted mt-1">
                                                Enable edit mode to customize panel positions and sizes
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                                isEditing
                                                    ? 'bg-magic-primary text-white'
                                                    : 'bg-magic-hover text-magic-muted hover:bg-magic-hover/80'
                                            }`}
                                        >
                                            {isEditing ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                                        </button>
                                    </div>

                                    {/* Save/Reset Buttons - Only show when in edit mode */}
                                    {isEditing && (
                                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                                            <button
                                                onClick={resetLayout}
                                                className="flex-1 px-4 py-2 bg-magic-error/10 text-magic-error rounded-lg 
                                                         hover:bg-magic-error/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                <span>Reset to Default</span>
                                            </button>
                                            <button
                                                onClick={saveLayout}
                                                className="flex-1 px-4 py-2 bg-magic-success/10 text-magic-success rounded-lg 
                                                         hover:bg-magic-success/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                <span>Save Layout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Theme Settings */}
                            <div className="space-y-4 border-t border-magic-border pt-4">
                                <h3 className="text-lg font-medium">Display Settings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Dark Mode</label>
                                        <ThemeToggle />
                                    </div>
                                    <div className="bg-magic-card rounded-lg border border-magic-border p-4">
                                        <ThemeCustomizer />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
};

export default WebTerminal;
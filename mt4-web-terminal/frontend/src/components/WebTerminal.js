import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    X, 
    TrendingUp, 
    TrendingDown,
    ChevronUp,
    ChevronDown,
    Target,
    Pencil,
    SplitSquareHorizontal,
    XCircle,
    ArrowUp,
    ArrowDown,
    Package,
    Settings,
    Activity,
    DollarSign, 
    Wallet, 
    RefreshCw, 
    BarChart2, 
    AlertCircle, 
    DragHandle,
    Cog
} from 'lucide-react';
import { Button } from "./ui/button.jsx";
import { ThemeToggle } from './ThemeToggle';
import ThemeCustomizer from './ThemeCustomizer';
import { CustomLayout } from './CustomLayout';
import { Dialog } from './Dialog';
import SettingsPanel from './SettingsPanel';
import '../styles/edit-mode.css';
import TradingViewChart from './TradingViewChart';
import Draggable from 'react-draggable';
import { colors, componentColors, addOpacity } from '../styles/colors';
import { ToastContainer } from './Toast';
import Dashboard from './Dashboard';

// Layout presets with fixed dimensions and positions
const LAYOUT_PRESETS = {
    default: {
        name: 'Default',
        description: 'Standard layout with large chart and side panels',
        layout: [
            { i: "chart", x: 0, y: 5, w: 8, h: 17 },
            { i: "account", x: 0, y: 0, w: 8, h: 5 },
            { i: "positions", x: 8, y: 9, w: 4, h: 13 },
            { i: "orders", x: 8, y: 0, w: 4, h: 9 },
            { i: "dashboard", x: 0, y: 22, w: 12, h: 15 }
        ]
    },
    compact: {
        name: 'Compact',
        description: 'Compact layout with equal panel sizes',
        layout: [
            { i: "chart", x: 0, y: 0, w: 12, h: 12 },
            { i: "account", x: 0, y: 12, w: 4, h: 8 },
            { i: "positions", x: 4, y: 12, w: 4, h: 8 },
            { i: "orders", x: 8, y: 12, w: 4, h: 8 }
        ]
    },
    wide: {
        name: 'Wide Chart',
        description: 'Full-width chart with stacked panels',
        layout: [
            { i: "chart", x: 0, y: 0, w: 12, h: 14 },
            { i: "account", x: 0, y: 14, w: 12, h: 4 },
            { i: "positions", x: 0, y: 18, w: 6, h: 8 },
            { i: "orders", x: 6, y: 18, w: 6, h: 8 }
        ]
    },
    trading: {
        name: 'Trading Focus',
        description: 'Optimized for active trading with larger positions panel',
        layout: [
            { i: "chart", x: 0, y: 0, w: 8, h: 14 },
            { i: "account", x: 8, y: 0, w: 4, h: 6 },
            { i: "positions", x: 8, y: 6, w: 4, h: 10 },
            { i: "orders", x: 0, y: 14, w: 12, h: 6 }
        ]
    }
};

const DEFAULT_LAYOUT = LAYOUT_PRESETS.default.layout;

const WebTerminal = () => {
    const [accountData, setAccountData] = useState({
        balance: null,
        equity: null,
        margin: null,
        freeMargin: null
    });
    
    // Sample equity history data
    const [equityHistory] = useState([
        { time: '00:00', value: 10000 },
        { time: '04:00', value: 10250 },
        { time: '08:00', value: 10150 },
        { time: '12:00', value: 10400 },
        { time: '16:00', value: 10300 },
        { time: '20:00', value: 10500 },
        { time: '24:00', value: 10450 }
    ]);

    const [positions, setPositions] = useState([]);
    const [serverConnected, setServerConnected] = useState(false);
    const [eaConnected, setEaConnected] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [isModifying, setIsModifying] = useState(false);
    const [modifyValues, setModifyValues] = useState({
        sl: '',
        tp: ''
    });
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    
    // Add toast state
    const [toasts, setToasts] = useState([]);
    const toastTimeoutsRef = React.useRef(new Map());
    const eaConnectingToastRef = React.useRef(null);

    const removeToast = useCallback((id) => {
        if (toastTimeoutsRef.current.has(id)) {
            clearTimeout(toastTimeoutsRef.current.get(id));
            toastTimeoutsRef.current.delete(id);
        }
        if (eaConnectingToastRef.current === id) {
            eaConnectingToastRef.current = null;
        }
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        
        // Handle EA connection toast
        if (message === 'Trying to connect to EA') {
            if (eaConnectingToastRef.current) {
                removeToast(eaConnectingToastRef.current);
            }
            eaConnectingToastRef.current = id;
        }
        
        // Remove any existing toasts with the same message
        setToasts(prev => {
            const filtered = prev.filter(t => t.message !== message);
            return [...filtered, { id, message, type }];
        });

        // Set a timeout to remove the toast
        const timeout = setTimeout(() => removeToast(id), 3300);
        toastTimeoutsRef.current.set(id, timeout);

        return id;
    }, [removeToast]);

    // Cleanup all toasts on unmount
    useEffect(() => {
        return () => {
            toastTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            toastTimeoutsRef.current.clear();
            if (eaConnectingToastRef.current) {
                removeToast(eaConnectingToastRef.current);
                eaConnectingToastRef.current = null;
            }
        };
    }, [removeToast]);

    // WebSocket reference and reconnection settings
    const ws = React.useRef(null);
    const reconnectAttempts = React.useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000; // 2 seconds
    const reconnectBackoff = 1.5; // Exponential backoff multiplier
    const reconnectTimeout = React.useRef(null);
    const isConnecting = React.useRef(false);
    const hasInitialConnection = React.useRef(false);
    const isMounted = React.useRef(false);
    const isInitialized = React.useRef(false);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (ws.current) {
            ws.current.onclose = null; // Remove the onclose handler before closing
            ws.current.close();
            ws.current = null;
        }
        isConnecting.current = false;
    }, []);

    // Send WebSocket message helper
    const sendMessage = useCallback(async (message) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        try {
            ws.current.send(JSON.stringify({
                type: 'command',
                ...message
            }));
        } catch (error) {
            console.error('Send message error:', error);
            throw error;
        }
    }, []);

    // WebSocket connection handler
    const connectWebSocket = useCallback(() => {
        // Strict initialization check
        if (isInitialized.current) {
            console.log('WebSocket already initialized');
            return;
        }
        isInitialized.current = true;

        // Don't attempt to connect if component is not mounted
        if (!isMounted.current) {
            console.log('Component not mounted, skipping connection');
            return;
        }

        try {
            cleanup();
            isConnecting.current = true;
            const connectingToast = addToast('Trying to connect to server', 'info');

            ws.current = new WebSocket('wss://g1-back.onrender.com');

            ws.current.onopen = () => {
                if (!isMounted.current) {
                    cleanup();
                    return;
                }

                console.log('WebSocket Connected');
                isConnecting.current = false;
                hasInitialConnection.current = true;
                setServerConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
                removeToast(connectingToast);
                addToast('Connected to server', 'success');

                if (!eaConnected) {
                    addToast('Trying to connect to EA', 'info');
                }

                // Request initial data
                const initialRequests = [
                    { command: 'GetStatus' },
                    { command: 'GetPositions' },
                    { command: 'GetAccount' }
                ];

                initialRequests.forEach((req, index) => {
                    setTimeout(() => {
                        if (ws.current?.readyState === WebSocket.OPEN && isMounted.current) {
                            console.log('Sending request:', req.command);
                            sendMessage({
                                ...req,
                                timestamp: Date.now()
                            }).catch(error => {
                                if (isMounted.current) {
                                    console.error(`Error requesting ${req.command}:`, error);
                                    addToast(`Failed to request ${req.command}`, 'error');
                                }
                            });
                        }
                    }, index * 100);
                });
            };

            ws.current.onclose = (event) => {
                if (!isMounted.current) return;

                console.log('WebSocket Disconnected:', event);
                const wasConnected = serverConnected;
                isConnecting.current = false;
                isInitialized.current = false; // Reset initialization on close
                setServerConnected(false);
                setEaConnected(false);
                setAccountData({
                    balance: 0,
                    equity: 0,
                    margin: 0,
                    freeMargin: 0
                });
                
                if (wasConnected) {
                    addToast('Connection lost. Attempting to reconnect...', 'warning');
                }

                if (isMounted.current && !event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(reconnectBackoff, reconnectAttempts.current);
                    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                    reconnectTimeout.current = setTimeout(() => {
                        if (isMounted.current) {
                            reconnectAttempts.current++;
                            isInitialized.current = false; // Reset initialization before reconnect
                            connectWebSocket();
                        }
                    }, delay);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    addToast('Maximum reconnection attempts reached. Please refresh the page.', 'error');
                }
            };

            ws.current.onerror = (error) => {
                if (!isMounted.current) return;

                console.error('WebSocket Error:', error);
                if (!isConnecting.current) {
                    addToast('Connection error occurred', 'error');
                }
                isConnecting.current = false;
                isInitialized.current = false; // Reset initialization on error
            };

            ws.current.onmessage = handleMessage;
        } catch (error) {
            if (!isMounted.current) return;

            console.error('Error creating WebSocket:', error);
            addToast('Failed to create WebSocket connection', 'error');
            setServerConnected(false);
            setEaConnected(false);
            isConnecting.current = false;
            isInitialized.current = false; // Reset initialization on error
        }
    }, [addToast, serverConnected, eaConnected]);

    // WebSocket message handler
    const handleMessage = useCallback((event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            switch (data.type) {
                case 'positions':
                    console.log('Updating positions:', data.data);
                    setPositions(data.data || []);
                    break;
                case 'account':
                    const accountData = data.data || {};
                    console.log('Updating account data:', accountData);
                    setAccountData({
                        balance: parseFloat(accountData.balance) || 0,
                        equity: parseFloat(accountData.equity) || 0,
                        margin: parseFloat(accountData.margin) || 0,
                        freeMargin: parseFloat(accountData.freeMargin) || 0
                    });
                    break;
                case 'status':
                    const isConnected = data.data?.connected === true;
                    console.log('Updating connection status:', isConnected);
                    if (isConnected !== eaConnected) {  // Only update if status actually changed
                        setEaConnected(isConnected);
                        if (isConnected) {
                            if (eaConnectingToastRef.current) {
                                removeToast(eaConnectingToastRef.current);
                                eaConnectingToastRef.current = null;
                            }
                            addToast('Connected to MT4 Terminal', 'success');
                        }
                    }
                    break;
                case 'update':
                    // Handle legacy update message type
                    console.log('Handling legacy update message:', data);
                    if (typeof data.connected === 'boolean' && data.connected !== eaConnected) {
                        setEaConnected(data.connected);
                        if (data.connected) {
                            if (eaConnectingToastRef.current) {
                                removeToast(eaConnectingToastRef.current);
                                eaConnectingToastRef.current = null;
                            }
                            addToast('Connected to MT4 Terminal', 'success');
                        }
                    }
                    if (data.data) {
                        if (data.data.positions) {
                            console.log('Updating positions from legacy message:', data.data.positions);
                            setPositions(data.data.positions || []);
                        }
                        if (data.data.account) {
                            console.log('Updating account from legacy message:', data.data.account);
                            const legacyAccount = data.data.account;
                            setAccountData({
                                balance: parseFloat(legacyAccount.balance) || 0,
                                equity: parseFloat(legacyAccount.equity) || 0,
                                margin: parseFloat(legacyAccount.margin) || 0,
                                freeMargin: parseFloat(legacyAccount.freeMargin) || 0
                            });
                        }
                    }
                    break;
                case 'error':
                    console.error('Server error:', data.error);
                    addToast(data.error || 'An error occurred', 'error');
                    break;
                default:
                    console.log('Unhandled message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            addToast('Error processing server message', 'error');
        }
    }, [addToast, eaConnected, setPositions, setAccountData, setEaConnected]);

    // Initialize connection exactly once on mount
    useEffect(() => {
        if (!isMounted.current) {
            console.log('Initial mount, setting up WebSocket');
            isMounted.current = true;
            hasInitialConnection.current = false;
            isInitialized.current = false;
            connectWebSocket();
        }

        return () => {
            console.log('Unmounting component, cleaning up');
            isMounted.current = false;
            isInitialized.current = false;
            cleanup();
        };
    }, []); // Empty dependency array to ensure it only runs once

    // Load saved layout on component mount
    const [layoutState, setLayoutState] = useState(() => {
        try {
            const savedLayout = localStorage.getItem('layoutSettings');
            return {
                currentLayout: savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT
            };
        } catch (error) {
            console.error('Error loading saved layout:', error);
            return { currentLayout: DEFAULT_LAYOUT };
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

    // Add this state at the component level where positions are managed
    const [expandedPositions, setExpandedPositions] = useState(new Set());

    const togglePositionExpand = useCallback((ticket) => {
        setExpandedPositions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(ticket)) {
                newSet.delete(ticket);
            } else {
                newSet.add(ticket);
            }
            return newSet;
        });
    }, []);

    // Handle selecting a preset
    const handlePresetSelect = (preset) => {
        if (!LAYOUT_PRESETS[preset]) {
            console.error('Invalid preset selected:', preset);
            return;
        }

        const newLayout = [...LAYOUT_PRESETS[preset].layout];
        setLayoutState({ currentLayout: newLayout });
        setIsEditing(true);
    };

    // Handle layout changes during editing
    const handleLayoutChange = (newLayout) => {
        if (!isEditing) return;

        const validatedLayout = newLayout.map(item => ({
            i: item.i,
            x: parseInt(item.x) || 0,
            y: parseInt(item.y) || 0,
            w: Math.max(parseInt(item.w) || 2, 2),
            h: Math.max(parseInt(item.h) || 2, 2)
        }));

        setLayoutState({ currentLayout: validatedLayout });
        
        // Save immediately to localStorage
        try {
            localStorage.setItem('layoutSettings', JSON.stringify(validatedLayout));
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    // Save layout changes
    const saveLayout = () => {
        try {
            const layoutToSave = layoutState.currentLayout;
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
            localStorage.setItem('layoutSettings', JSON.stringify(validatedLayout));

            setIsEditing(false);
            setIsSettingsOpen(false);
        } catch (error) {
            console.error('Error saving layout:', error);
        }
    };

    // Reset to default layout
    const resetLayout = () => {
        try {
            setLayoutState({ currentLayout: DEFAULT_LAYOUT });
            localStorage.setItem('layoutSettings', JSON.stringify(DEFAULT_LAYOUT));
            setIsEditing(false);
            setIsSettingsOpen(false);
        } catch (error) {
            console.error('Error resetting layout:', error);
        }
    };

    // Handle settings panel close
    const handleSettingsClose = () => {
        setIsEditing(false);
        setIsSettingsOpen(false);
    };

    // Action handlers
    const handleClosePosition = useCallback(async (ticket, percentage = 100) => {
        try {
            if (!ws.current || !eaConnected) {
                throw new Error('Not connected to server');
            }

            // The EA expects a CSV format: CLOSE,ticket,percentage
            const command = `CLOSE,${ticket},${percentage}`;
            
            ws.current.send(JSON.stringify({
                data: command,
                timestamp: Date.now()
            }));
            
            addToast('Position close request sent', 'info');
        } catch (error) {
            console.error('Close position error:', error);
            addToast('Failed to close position: ' + error.message, 'error');
        }
    }, [addToast, eaConnected]);

    const handleCloseAll = useCallback(async () => {
        try {
            if (!ws.current || !eaConnected) {
                throw new Error('Not connected to server');
            }

            // Send close command for each open position
            positions.forEach(position => {
                const command = `CLOSE,${position.ticket},100`;
                ws.current.send(JSON.stringify({
                    data: command,
                    timestamp: Date.now()
                }));
            });
            
            addToast('Close all positions request sent', 'info');
        } catch (error) {
            console.error('Close all positions error:', error);
            addToast('Failed to close all positions: ' + error.message, 'error');
        }
    }, [addToast, eaConnected, positions]);

    const handleBreakEven = useCallback(async (ticket) => {
        try {
            if (!ws.current || !eaConnected) {
                throw new Error('Not connected to server');
            }

            // The EA expects a CSV format: BE,ticket
            const command = `BE,${ticket}`;
            
            ws.current.send(JSON.stringify({
                data: command,
                timestamp: Date.now()
            }));
            
            addToast('Break even request sent', 'info');
        } catch (error) {
            console.error('Break even error:', error);
            addToast('Failed to set break even: ' + error.message, 'error');
        }
    }, [addToast, eaConnected]);

    const handleModify = useCallback(async (ticket, sl, tp) => {
        try {
            if (!ws.current || !eaConnected) {
                throw new Error('Not connected to server');
            }

            // The EA expects a CSV format: MODIFY,ticket,sl,tp
            const command = `MODIFY,${ticket},${sl},${tp}`;
            
            ws.current.send(JSON.stringify({
                data: command,
                timestamp: Date.now()
            }));
            
            addToast('Position modify request sent', 'info');
        } catch (error) {
            console.error('Modify position error:', error);
            addToast('Failed to modify position: ' + error.message, 'error');
        }
    }, [addToast, eaConnected]);

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
            cleanup();
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
            await sendMessage(command);
            
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

    const Position = ({ position, onClose, isExpanded, onToggleExpand, onPartialClose, onModifyOpen }) => {
        const [isHovered, setIsHovered] = useState(false);
        const [isClosing, setIsClosing] = useState(false);

        const handleBreakEven = async () => {
            try {
                if (!ws.current || !eaConnected) return;
                
                sendMessage({
                    command: 'BE',
                    data: `BE,${position.ticket}`,
                    timestamp: Date.now()
                }).then(() => {
                    addToast('Break even command sent successfully', 'success');
                }).catch(error => {
                    addToast(`Break even error: ${error}`, 'error');
                });
            } catch (error) {
                console.error('Break even error:', error);
                addToast(error.message, 'error');
            }
        };

        const handleClose = async () => {
            setIsClosing(true);
            try {
                await onClose();
            } catch (error) {
                console.error('Close position error:', error);
                setError(error.message);
                setIsClosing(false);
            }
        };

        const handleCopy = (value) => {
            navigator.clipboard.writeText(value).then(() => {
                addToast('Price copied to clipboard', 'success');
            }).catch(err => {
                addToast('Failed to copy price', 'error');
            });
        };

        const PriceField = ({ label, value }) => (
            <div className="flex items-center space-x-2">
                <button 
                    onClick={() => handleCopy(value)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
                    title="Copy price"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                </button>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm">{value}</span>
                </div>
            </div>
        );

        return (
            <div 
                className={`relative bg-opacity-50 rounded-lg p-4 mb-2 transition-all duration-200 ${
                    isHovered ? 'bg-opacity-75' : ''
                }`}
                style={{ backgroundColor: colors.background.secondary }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Position Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <span className={`text-2xl ${position.type === 0 ? 'text-magic-success' : 'text-magic-error'}`}>
                            {position.type === 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </span>
                        <div>
                            <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                                {position.symbol}
                            </h3>
                            <p className="text-sm" style={{ color: colors.text.muted }}>
                                Ticket: {position.ticket}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                                {position.lots} Lots
                            </p>
                            <p className={`text-sm font-semibold ${position.profit >= 0 ? 'text-magic-success' : 'text-magic-error'}`}>
                                {(position.profit || 0).toFixed(2)} USD
                            </p>
                        </div>
                        <button 
                            onClick={() => onToggleExpand(position.ticket)}
                            className="p-2 rounded-full hover:bg-opacity-25 transition-all duration-200"
                            style={{ 
                                backgroundColor: colors.background.hover,
                                color: colors.text.muted 
                            }}
                        >
                            <ChevronDown 
                                size={20} 
                                className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: colors.text.muted }}
                            />
                        </button>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <>
                        {/* Position Details */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm" style={{ color: colors.text.muted }}>
                            <div>
                                <PriceField label="Open Price" value={position.openPrice} />
                                <PriceField label="Stop Loss" value={position.sl || 'Not Set'} />
                                <PriceField label="Take Profit" value={position.tp || 'Not Set'} />
                            </div>
                            <div>
                                <div className="flex flex-col mb-2">
                                    <span className="text-xs text-gray-500">Swap</span>
                                    <span className="text-sm">{(position.swap || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col mb-2">
                                    <span className="text-xs text-gray-500">Commission</span>
                                    <span className="text-sm">{(position.commission || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500">Total</span>
                                    <span className="text-sm">{((position.profit || 0) + (position.swap || 0) + (position.commission || 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border.light }}>
                            {/* Break Even Button */}
                            <button 
                                onClick={handleBreakEven}
                                className="flex-1 flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200"
                                style={{
                                    backgroundColor: colors.status.info.bg,
                                    borderColor: colors.status.info.border,
                                    borderWidth: '1px'
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: colors.status.info.base }}>Break Even</span>
                            </button>

                            {/* Modify Button */}
                            <button 
                                onClick={() => onModifyOpen(position)}
                                className="flex-1 flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200"
                                style={{
                                    backgroundColor: colors.status.warning.bg,
                                    borderColor: colors.status.warning.border,
                                    borderWidth: '1px'
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: colors.status.warning.base }}>Modify</span>
                            </button>

                            {/* Partial Button */}
                            <button 
                                onClick={() => onPartialClose(position.ticket)}
                                className="flex-1 flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200"
                                style={{
                                    backgroundColor: colors.status.warning.bg,
                                    borderColor: colors.status.warning.border,
                                    borderWidth: '1px'
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: colors.status.warning.base }}>Partial</span>
                            </button>

                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                disabled={isClosing}
                                className="flex-1 flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200"
                                style={{
                                    backgroundColor: colors.status.error.bg,
                                    borderColor: colors.status.error.border,
                                    borderWidth: '1px'
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: colors.status.error.base }}>
                                    {isClosing ? 'Closing...' : 'Close'}
                                </span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Track positions that are being closed
    const [closingPositions] = useState(new Set());

    // Handle position removal after animation
    const handlePositionClose = useCallback((ticket) => {
        setPositions(prev => prev.filter(pos => pos.ticket !== ticket));
    }, []);

    // Update the WebSocket message handler to detect closed positions
    const handleWebSocketMessage = useCallback((event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            if (data.type === 'update') {
                if (data.data) {
                    if (data.data.connected !== undefined) {
                        setEaConnected(!!data.connected);
                    }

                    if (data.data.account) {
                        setAccountData(prevData => ({
                            ...prevData,
                            ...data.data.account
                        }));
                    }

                    if (data.data.positions) {
                        setPositions(prevPositions => {
                            // Find positions that were in the previous state but not in the new update
                            const closedTickets = prevPositions
                                .filter(prevPos => !data.data.positions.some(newPos => newPos.ticket === prevPos.ticket))
                                .map(pos => pos.ticket);

                            // Mark these positions as closed but keep them in the state temporarily
                            const updatedPositions = prevPositions.map(pos => ({
                                ...pos,
                                closed: closedTickets.includes(pos.ticket)
                            }));

                            // Add any new positions from the update
                            const newPositions = data.data.positions
                                .filter(newPos => !prevPositions.some(prevPos => prevPos.ticket === newPos.ticket))
                                .map(pos => ({ ...pos, closed: false }));

                            return [...updatedPositions, ...newPositions];
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, []);

    // Update the existing renderPositions function to handle closed positions
    const [partialCloseDialog, setPartialCloseDialog] = useState({
        isOpen: false,
        ticket: null,
        percentage: 50  // Default to 50%
    });

    const handlePartialClose = useCallback((ticket) => {
        setPartialCloseDialog(prev => ({ ...prev, isOpen: true, ticket }));
    }, []);

    const handleModifyOpen = useCallback((position) => {
        setSelectedPosition(position);
        setModifyValues({
            sl: position.sl || '',
            tp: position.tp || ''
        });
        setShowModifyDialog(true);
    }, []);

    const positionList = positions.map(position => (
        <Position
            key={position.ticket}
            position={position}
            onClose={() => handleClosePosition(position.ticket)}
            isExpanded={expandedPositions.has(position.ticket)}
            onToggleExpand={() => togglePositionExpand(position.ticket)}
            onPartialClose={handlePartialClose}
            onModifyOpen={handleModifyOpen}
        />
    ));

    const toggleEditMode = () => {
        setIsEditing(!isEditing);
        setIsSettingsOpen(false);
    };

    const toggleSettings = () => {
        setIsSettingsOpen(!isSettingsOpen);
        if (isEditing) {
            setIsEditing(false);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark');
    };

    const SETTINGS_PANEL_WIDTH = 320;
    const SETTINGS_PANEL_MARGIN = 20;

    const calculateSettingsPosition = () => ({
        x: Math.max(SETTINGS_PANEL_MARGIN, window.innerWidth - SETTINGS_PANEL_WIDTH - SETTINGS_PANEL_MARGIN),
        y: SETTINGS_PANEL_MARGIN
    });

    const [settingsPosition, setSettingsPosition] = useState(calculateSettingsPosition());

    // Update settings position when window is resized
    React.useEffect(() => {
        const handleResize = () => {
            if (isSettingsOpen) {
                setSettingsPosition(calculateSettingsPosition());
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isSettingsOpen]);

    // Add state variables at the top of the component
    const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
    const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
    const [serverAddress, setServerAddress] = useState('localhost:8080');
    const [defaultLotSize, setDefaultLotSize] = useState(0.01);
    const [riskPercentage, setRiskPercentage] = useState(1);

    // Available options
    const timeframes = ['1M', '5M', '15M', '30M', '1H', '4H', 'D1', 'W1', 'MN'];
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];

    // Settings handler
    const handleSaveSettings = useCallback(() => {
        // Save settings to localStorage or send to backend
        const settings = {
            serverAddress,
            defaultLotSize,
            riskPercentage,
            selectedTimeframe,
            selectedSymbol
        };

        localStorage.setItem('mt4Settings', JSON.stringify(settings));
        setIsSettingsOpen(false);
    }, [serverAddress, defaultLotSize, riskPercentage, selectedTimeframe, selectedSymbol]);

    // Load settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('mt4Settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setServerAddress(settings.serverAddress || 'localhost:8080');
            setDefaultLotSize(settings.defaultLotSize || 0.01);
            setRiskPercentage(settings.riskPercentage || 1);
            setSelectedTimeframe(settings.selectedTimeframe || '1H');
            setSelectedSymbol(settings.selectedSymbol || 'EURUSD');
        }
    }, []);

    const renderTopBar = () => {
        return (
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border.light }}>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${eaConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-sm" style={{ color: colors.text.primary }}>
                            {eaConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Theme Toggle */}
                    <ThemeToggle />
                    
                    {/* Settings Button */}
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="p-2 rounded-lg transition-all duration-200"
                        style={{ 
                            backgroundColor: isSettingsOpen ? colors.background.hover : 'transparent',
                            color: colors.text.muted 
                        }}
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    const renderPositionsHeader = () => {
        return (
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border.light }}>
                <h2 className="flex items-center gap-2 text-lg font-medium" style={{ color: colors.text.primary }}>
                    {isEditing && <div className="drag-handle w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center cursor-move">⋮⋮</div>}
                    Open Positions
                </h2>
                {positions.length > 0 && (
                    <button
                        onClick={handleCloseAll}
                        className="px-3 py-1.5 rounded-lg text-sm transition-all duration-200"
                        style={{ 
                            backgroundColor: colors.status.error.bg,
                            color: colors.status.error.base,
                            borderColor: colors.status.error.border,
                            borderWidth: '1px'
                        }}
                    >
                        Close All
                    </button>
                )}
            </div>
        );
    };

    const renderChart = () => {
        return (
            <div key="chart" className="flex flex-col h-full" style={{ backgroundColor: colors.background.secondary }}>
                {isEditing && (
                    <div className="flex items-center p-4 border-b" style={{ borderColor: colors.border.light }}>
                        <div className="drag-handle w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center cursor-move">
                            ⋮⋮
                        </div>
                    </div>
                )}

                {/* Chart Content */}
                <div className="flex-1 relative">
                    <TradingViewChart
                        symbol={selectedSymbol}
                        interval={selectedTimeframe}
                        theme={theme}
                        positions={positions}
                        orders={[]} // We'll handle pending orders separately if needed
                    />
                </div>
            </div>
        );
    };

    const renderAccountInfo = () => {
        return (
            <div key="account" className="flex flex-col h-full" style={{ backgroundColor: colors.background.secondary }}>
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border.light }}>
                    <h2 className="flex items-center gap-2 text-lg font-medium" style={{ color: colors.text.primary }}>
                        {isEditing && <div className="drag-handle w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center cursor-move">⋮⋮</div>}
                        Account Information
                    </h2>
                </div>

                {/* Account Stats */}
                <div className="p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Balance Card */}
                        <div className="p-3 rounded-lg transition-all duration-200"
                            style={{ 
                                backgroundColor: colors.background.tertiary,
                                borderWidth: '1px',
                                borderColor: colors.border.light,
                            }}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Wallet className="w-4 h-4" style={{ color: colors.status.info.base }} />
                                <span className="text-xs" style={{ color: colors.text.muted }}>Balance</span>
                            </div>
                            <div className="text-base font-medium" style={{ color: colors.text.primary }}>
                                {accountData?.balance || '0.00'}
                            </div>
                        </div>

                        {/* Equity Card */}
                        <div className="p-3 rounded-lg transition-all duration-200"
                            style={{ 
                                backgroundColor: colors.background.tertiary,
                                borderWidth: '1px',
                                borderColor: colors.border.light,
                            }}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Activity className="w-4 h-4" style={{ color: colors.status.success.base }} />
                                <span className="text-xs" style={{ color: colors.text.muted }}>Equity</span>
                            </div>
                            <div className="text-base font-medium" style={{ color: colors.text.primary }}>
                                {accountData?.equity || '0.00'}
                            </div>
                        </div>

                        {/* Margin Card */}
                        <div className="p-3 rounded-lg transition-all duration-200"
                            style={{ 
                                backgroundColor: colors.background.tertiary,
                                borderWidth: '1px',
                                borderColor: colors.border.light,
                            }}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <DollarSign className="w-4 h-4" style={{ color: colors.status.warning.base }} />
                                <span className="text-xs" style={{ color: colors.text.muted }}>Margin</span>
                            </div>
                            <div className="text-base font-medium" style={{ color: colors.text.primary }}>
                                {accountData?.margin || '0.00'}
                            </div>
                        </div>

                        {/* Free Margin Card */}
                        <div className="p-3 rounded-lg transition-all duration-200"
                            style={{ 
                                backgroundColor: colors.background.tertiary,
                                borderWidth: '1px',
                                borderColor: colors.border.light,
                            }}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <RefreshCw className="w-4 h-4" style={{ color: colors.status.info.base }} />
                                <span className="text-xs" style={{ color: colors.text.muted }}>Free Margin</span>
                            </div>
                            <div className="text-base font-medium" style={{ color: colors.text.primary }}>
                                {accountData?.freeMargin || '0.00'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDashboard = () => {
        return (
            <div key="dashboard" className="bg-[#12131A] rounded-lg overflow-hidden">
                <Dashboard 
                    accountData={accountData}
                    equityHistory={equityHistory}
                    connected={serverConnected}
                    eaConnected={eaConnected}
                />
            </div>
        );
    };

    const renderPartialCloseDialog = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-[#1a1f2e] rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4 text-white">Partial Close Position</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Close Percentage
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={partialCloseDialog.percentage}
                            onChange={(e) => setPartialCloseDialog(prev => ({
                                ...prev,
                                percentage: Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
                            }))}
                            className="w-full px-3 py-2 bg-[#2a3441] border border-[#3a4451] rounded-md text-white"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setPartialCloseDialog(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                sendMessage({
                                    command: 'PARTIAL',
                                    data: `PARTIAL,${partialCloseDialog.ticket},${partialCloseDialog.percentage}`,
                                    timestamp: Date.now()
                                }).then(() => {
                                    addToast(`Partially closing position ${partialCloseDialog.ticket}`, 'info');
                                }).catch(error => {
                                    addToast(`Failed to partially close position: ${error}`, 'error');
                                });
                                setPartialCloseDialog(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const [showModifyDialog, setShowModifyDialog] = useState(false);

    const renderModifyDialog = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-[#1a1f2e] rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4 text-white">Modify Position</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Stop Loss
                        </label>
                        <input
                            type="number"
                            value={modifyValues.sl}
                            onChange={(e) => setModifyValues(prev => ({ ...prev, sl: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#2a3441] border border-[#3a4451] rounded-md text-white"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Take Profit
                        </label>
                        <input
                            type="number"
                            value={modifyValues.tp}
                            onChange={(e) => setModifyValues(prev => ({ ...prev, tp: e.target.value }))}
                            className="w-full px-3 py-2 bg-[#2a3441] border border-[#3a4451] rounded-md text-white"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setShowModifyDialog(false)}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                sendMessage({
                                    command: 'MODIFY',
                                    data: `MODIFY,${selectedPosition.ticket},${modifyValues.sl},${modifyValues.tp}`,
                                    timestamp: Date.now()
                                }).then(() => {
                                    addToast(`Modifying position ${selectedPosition.ticket}`, 'info');
                                }).catch(error => {
                                    addToast(`Failed to modify position: ${error}`, 'error');
                                });
                                setShowModifyDialog(false);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen"
            style={{ backgroundColor: colors.background.primary }}>
            {/* Header */}
            {renderTopBar()}
            
            {/* Main content area */}
            <div className="flex-1 overflow-hidden"
                style={{ backgroundColor: colors.background.primary }}>
                <CustomLayout
                    layout={layoutState.currentLayout}
                    onLayoutChange={handleLayoutChange}
                    isEditing={isEditing}
                    className={`h-full ${isEditing ? 'layout-edit-mode' : ''}`}
                >
                    {/* Chart */}
                    {renderChart()}

                    {/* Account Information */}
                    {renderAccountInfo()}

                    {/* Open Positions */}
                    <div key="positions" className="flex flex-col h-full" style={{ backgroundColor: colors.background.secondary }}>
                        {/* Panel Header */}
                        {renderPositionsHeader()}

                        {/* Positions List */}
                        <div className="flex-1 overflow-auto">
                            {positions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-8"
                                    style={{ color: colors.text.muted }}>
                                    <Package className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm">No open positions</p>
                                </div>
                            ) : (
                                <div className="grid gap-3 p-4">
                                    {positionList}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* New Order */}
                    <div key="orders" className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: colors.background.secondary }}>
                        {/* Panel Header */}
                        <div className="flex items-center justify-between p-4 border-b"
                            style={{ borderColor: colors.border.light }}>
                            <h2 className="flex items-center gap-2 text-lg font-medium" style={{ color: colors.text.primary }}>
                                {isEditing && <div className="drag-handle w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center cursor-move">⋮⋮</div>}
                                New Order
                            </h2>
                        </div>

                        {/* Panel Content */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            {/* Form Content */}
                            <div className="space-y-4 max-w-lg mx-auto">
                                {/* Symbol and Volume */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Symbol Input */}
                                    <div className="space-y-1">
                                        <label className="block text-xs" style={{ color: colors.text.muted }}>
                                            Symbol
                                        </label>
                                        <input
                                            type="text"
                                            value={newOrder.symbol}
                                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                                            className="w-full h-10 rounded-lg px-3 text-sm transition-all duration-200 outline-none"
                                            style={{
                                                backgroundColor: colors.background.tertiary,
                                                borderWidth: '1px',
                                                borderColor: colors.border.light,
                                                color: colors.text.primary,
                                                '::placeholder': { color: colors.text.muted },
                                            }}
                                            placeholder="Enter symbol"
                                        />
                                    </div>

                                    {/* Volume Input */}
                                    <div className="space-y-1">
                                        <label className="block text-xs" style={{ color: colors.text.muted }}>
                                            Volume (lots)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newOrder.lots}
                                            onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                            className="w-full h-10 rounded-lg px-3 text-sm transition-all duration-200 outline-none"
                                            style={{
                                                backgroundColor: colors.background.tertiary,
                                                borderWidth: '1px',
                                                borderColor: colors.border.light,
                                                color: colors.text.primary,
                                                '::placeholder': { color: colors.text.muted },
                                            }}
                                            placeholder="0.01"
                                        />
                                    </div>
                                </div>

                                {/* Stop Loss and Take Profit */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Stop Loss Input */}
                                    <div className="space-y-1">
                                        <label className="block text-xs" style={{ color: colors.text.muted }}>
                                            Stop Loss
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrder.stopLoss}
                                            onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                            className="w-full h-10 rounded-lg px-3 text-sm transition-all duration-200 outline-none"
                                            style={{
                                                backgroundColor: colors.background.tertiary,
                                                borderWidth: '1px',
                                                borderColor: colors.border.light,
                                                color: colors.text.primary,
                                                '::placeholder': { color: colors.text.muted },
                                            }}
                                            placeholder="0.00000"
                                        />
                                    </div>

                                    {/* Take Profit Input */}
                                    <div className="space-y-1">
                                        <label className="block text-xs" style={{ color: colors.text.muted }}>
                                            Take Profit
                                        </label>
                                        <input
                                            type="number"
                                            value={newOrder.takeProfit}
                                            onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                            className="w-full h-10 rounded-lg px-3 text-sm transition-all duration-200 outline-none"
                                            style={{
                                                backgroundColor: colors.background.tertiary,
                                                borderWidth: '1px',
                                                borderColor: colors.border.light,
                                                color: colors.text.primary,
                                                '::placeholder': { color: colors.text.muted },
                                            }}
                                            placeholder="0.00000"
                                        />
                                    </div>
                                </div>

                                {/* Buy/Sell Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                    {/* Buy Button */}
                                    <button
                                        onClick={() => executeTrade(0)}
                                        className="flex-1 relative flex items-center justify-center px-4 py-2.5 rounded-lg 
                                            transform hover:scale-[1.02] active:scale-[0.98]
                                            transition-all duration-300 ease-out min-w-[120px]"
                                        style={{
                                            backgroundColor: colors.action.buy.bg,
                                            borderWidth: '1px',
                                            borderColor: addOpacity(colors.action.buy.base, 0.2),
                                        }}
                                    >
                                        <ArrowUp className="w-4 h-4 mr-1.5" style={{ color: colors.action.buy.base }} />
                                        <span className="font-medium text-sm" style={{ color: colors.action.buy.base }}>
                                            Buy
                                        </span>
                                    </button>

                                    {/* Sell Button */}
                                    <button
                                        onClick={() => executeTrade(1)}
                                        className="flex-1 relative flex items-center justify-center px-4 py-2.5 rounded-lg 
                                            transform hover:scale-[1.02] active:scale-[0.98]
                                            transition-all duration-300 ease-out min-w-[120px]"
                                        style={{
                                            backgroundColor: colors.action.sell.bg,
                                            borderWidth: '1px',
                                            borderColor: addOpacity(colors.action.sell.base, 0.2),
                                        }}
                                    >
                                        <ArrowDown className="w-4 h-4 mr-1.5" style={{ color: colors.action.sell.base }} />
                                        <span className="font-medium text-sm" style={{ color: colors.action.sell.base }}>
                                            Sell
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard */}
                    {renderDashboard()}
                </CustomLayout>
            </div>

            {/* Settings Panel */}
            {isSettingsOpen && (
                <Draggable
                    handle=".drag-handle"
                    bounds="body"
                    defaultPosition={settingsPosition}
                    onStop={(e, data) => {
                        // Ensure the panel stays within viewport bounds
                        const x = Math.min(
                            Math.max(SETTINGS_PANEL_MARGIN, data.x),
                            window.innerWidth - SETTINGS_PANEL_WIDTH - SETTINGS_PANEL_MARGIN
                        );
                        const y = Math.max(SETTINGS_PANEL_MARGIN, data.y);
                        setSettingsPosition({ x, y });
                    }}
                >
                    <div className="fixed z-[9999] shadow-2xl">
                        <div className="w-[320px] bg-magic-background border border-magic-border rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-magic-border flex justify-between items-center drag-handle cursor-move select-none"
                                style={{ 
                                    background: 'linear-gradient(to right, #10B981, #3B82F6)',
                                    borderColor: 'rgba(255, 255, 255, 0.1)'
                                }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-white/50" />
                                    <h2 className="text-lg font-semibold text-white">Styling</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsSettingsOpen(false);
                                        setSettingsPosition(calculateSettingsPosition());
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="p-4" style={{ backgroundColor: '#12131A' }}>
                                <div className="space-y-4">
                                    {/* Layout Section */}
                                    <div>
                                        <h3 className="text-sm font-medium mb-2 text-white/80">Layout</h3>
                                        <div className="space-y-2">
                                            {/* Layout Presets */}
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            setLayoutState({ currentLayout: preset.layout });
                                                            localStorage.setItem('layoutSettings', JSON.stringify(preset.layout));
                                                        }}
                                                        className="p-3 rounded-lg border border-[#3B82F6]/20 text-white/80 hover:bg-[#3B82F6]/10 transition-all text-left"
                                                    >
                                                        <div className="text-sm font-medium">{preset.name}</div>
                                                        <div className="text-xs text-white/50 mt-1">{preset.description}</div>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {/* Edit Layout Button */}
                                            <button
                                                onClick={() => setIsEditing(!isEditing)}
                                                className={`w-full px-4 py-2 rounded-lg border transition-all ${
                                                    isEditing
                                                        ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                                                        : 'border-[#3B82F6]/20 text-white/80 hover:bg-[#3B82F6]/10'
                                                }`}
                                            >
                                                {isEditing ? 'Finish Editing' : 'Edit Layout'}
                                            </button>
                                            {isEditing && (
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={saveLayout}
                                                        className="w-full px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-white transition-all"
                                                    >
                                                        Save Layout
                                                    </button>
                                                    <button
                                                        onClick={resetLayout}
                                                        className="w-full px-4 py-2 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 transition-all"
                                                    >
                                                        Reset to Default
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Theme Section */}
                                    <div>
                                        <h3 className="text-sm font-medium mb-2 text-white/80">Theme</h3>
                                        <button
                                            onClick={toggleTheme}
                                            className="w-full px-4 py-2 rounded-lg border border-[#3B82F6]/20 text-white/80 hover:bg-[#3B82F6]/10 transition-all"
                                        >
                                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Draggable>
            )}

            {/* Partial Close Dialog */}
            {partialCloseDialog.isOpen && renderPartialCloseDialog()}

            {/* Modify Dialog */}
            {showModifyDialog && renderModifyDialog()}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default WebTerminal;
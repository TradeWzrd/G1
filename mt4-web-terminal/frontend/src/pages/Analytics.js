import React, { useState, useEffect } from 'react';
import TradingAnalytics from '../components/TradingAnalytics/TradingAnalytics';
import { motion } from 'framer-motion';
import { useWebSocket } from '../contexts/WebSocketContext';

const Analytics = () => {
    const [tradeHistory, setTradeHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { sendMessage, lastMessage } = useWebSocket();

    // Fetch trade history when component mounts
    useEffect(() => {
        fetchTradeHistory();
    }, []);

    // Handle incoming websocket messages
    useEffect(() => {
        if (!lastMessage?.data) return;
        
        try {
            const data = JSON.parse(lastMessage.data);
            if (data.type === 'tradeHistory') {
                processTradeHistory(data.trades);
            }
        } catch (err) {
            console.error('Error processing websocket message:', err);
        }
    }, [lastMessage]);

    const fetchTradeHistory = () => {
        setIsLoading(true);
        setError(null);
        
        // Request trade history from EA
        sendMessage(JSON.stringify({
            command: 'GET_TRADE_HISTORY',
            payload: {
                period: 'ALL' // You can adjust this based on needs
            }
        }));
    };

    const processTradeHistory = (trades) => {
        // Transform trade data into required format
        const processedTrades = trades.map(trade => ({
            ticket: trade.ticket,
            symbol: trade.symbol,
            type: trade.type, // 0 for buy, 1 for sell
            openTime: new Date(trade.openTime),
            closeTime: new Date(trade.closeTime),
            openPrice: trade.openPrice,
            closePrice: trade.closePrice,
            profit: trade.profit,
            volume: trade.volume,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            commission: trade.commission,
            swap: trade.swap
        }));

        setTradeHistory(processedTrades);
        setIsLoading(false);
    };

    return (
        <div className="h-full bg-[#12131A] text-white">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Trading Analytics</h1>
                    <button
                        onClick={fetchTradeHistory}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
                        />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                        <div className="text-red-500 text-center">
                            <p className="text-xl mb-4">Error loading trade history</p>
                            <button
                                onClick={fetchTradeHistory}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : (
                    <TradingAnalytics trades={tradeHistory} />
                )}
            </div>
        </div>
    );
};

export default Analytics;

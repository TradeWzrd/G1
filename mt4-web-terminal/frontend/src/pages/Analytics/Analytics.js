import React, { useState, useEffect } from 'react';
import TradingAnalytics from '../../components/TradingAnalytics/TradingAnalytics';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../contexts/WebSocketContext';

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
            const data = lastMessage.data;
            if (data.startsWith('HISTORY|')) {
                const trades = data.split(';').map(tradeStr => {
                    const [
                        prefix, ticket, symbol, type, openTime, closeTime,
                        openPrice, closePrice, lots, profit, commission, swap
                    ] = tradeStr.split('|');

                    return {
                        ticket: parseInt(ticket),
                        symbol,
                        type: parseInt(type),
                        openTime: new Date(openTime),
                        closeTime: new Date(closeTime),
                        openPrice: parseFloat(openPrice),
                        closePrice: parseFloat(closePrice),
                        volume: parseFloat(lots),
                        profit: parseFloat(profit),
                        commission: parseFloat(commission),
                        swap: parseFloat(swap)
                    };
                });

                setTradeHistory(trades);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Error processing trade history:', err);
            setError('Failed to process trade data');
            setIsLoading(false);
        }
    }, [lastMessage]);

    const fetchTradeHistory = () => {
        setIsLoading(true);
        setError(null);
        
        // Send simple command format
        sendMessage('HISTORY');
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
                            <p className="text-xl mb-4">{error}</p>
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

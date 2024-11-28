import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';

const TradingAnalytics = ({ trades = [] }) => {
    // States for different time periods
    const [timeframe, setTimeframe] = useState('day'); // day, week, month
    const [metrics, setMetrics] = useState({
        winLossRatio: 0,
        avgTradeDuration: 0,
        bestPairs: [],
        worstPairs: [],
        riskRewardRatio: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        avgProfitPerTrade: 0,
    });

    // Calculate metrics when trades change
    useEffect(() => {
        if (!trades.length) return;
        calculateMetrics(trades);
    }, [trades, timeframe]);

    const calculateMetrics = (trades) => {
        if (!trades.length) return;

        try {
            // Win/Loss Ratio
            const wins = trades.filter(t => t.profit > 0).length;
            const losses = trades.filter(t => t.profit < 0).length;
            const winLossRatio = losses > 0 ? wins / losses : wins;

            // Average Trade Duration
            const durations = trades.map(t => 
                new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()
            );
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

            // Best/Worst Pairs
            const pairPerformance = trades.reduce((acc, t) => {
                acc[t.symbol] = (acc[t.symbol] || 0) + t.profit;
                return acc;
            }, {});
            const sortedPairs = Object.entries(pairPerformance)
                .sort(([,a], [,b]) => b - a);
            const bestPairs = sortedPairs.slice(0, 5);
            const worstPairs = sortedPairs.slice(-5).reverse();

            // Risk/Reward Ratio
            const winningTrades = trades.filter(t => t.profit > 0);
            const losingTrades = trades.filter(t => t.profit < 0);
            const avgWin = winningTrades.length > 0 
                ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length 
                : 0;
            const avgLoss = losingTrades.length > 0
                ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0)) / losingTrades.length
                : 1;
            const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin;

            // Profit Factor
            const grossProfit = winningTrades.reduce((acc, t) => acc + t.profit, 0);
            const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0));
            const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

            // Maximum Drawdown
            let peak = 0;
            let maxDrawdown = 0;
            let runningTotal = 0;
            trades.forEach(t => {
                runningTotal += t.profit;
                if (runningTotal > peak) peak = runningTotal;
                const drawdown = peak - runningTotal;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            });

            // Sharpe Ratio (assuming risk-free rate of 0 for simplicity)
            const returns = trades.map(t => t.profit);
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const stdDev = Math.sqrt(
                returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
            ) || 1; // Avoid division by zero
            const sharpeRatio = avgReturn / stdDev;

            // Average Profit per Trade
            const avgProfitPerTrade = trades.reduce((acc, t) => acc + t.profit, 0) / trades.length;

            setMetrics({
                winLossRatio,
                avgTradeDuration: avgDuration,
                bestPairs,
                worstPairs,
                riskRewardRatio,
                profitFactor,
                maxDrawdown,
                sharpeRatio,
                avgProfitPerTrade,
            });
        } catch (error) {
            console.error('Error calculating metrics:', error);
        }
    };

    const timeframeOptions = [
        { value: 'day', label: 'Daily' },
        { value: 'week', label: 'Weekly' },
        { value: 'month', label: 'Monthly' }
    ];

    return (
        <div className="w-full h-full bg-[#1A1B23] text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Trading Performance Analytics</h2>
                <div className="flex gap-4">
                    {timeframeOptions.map(option => (
                        <button
                            key={option.value}
                            onClick={() => setTimeframe(option.value)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                timeframe === option.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-[#2A2B33] text-gray-300 hover:bg-[#3A3B43]'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-3 gap-6 h-[calc(100%-4rem)]">
                {/* Win/Loss Ratio */}
                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Win/Loss Ratio</h3>
                    <div className="text-3xl font-bold text-blue-500">
                        {metrics.winLossRatio.toFixed(2)}
                    </div>
                </div>

                {/* Average Trade Duration */}
                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Avg Trade Duration</h3>
                    <div className="text-3xl font-bold text-green-500">
                        {Math.floor(metrics.avgTradeDuration / (1000 * 60))}m
                    </div>
                </div>

                {/* Risk/Reward Ratio */}
                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Risk/Reward Ratio</h3>
                    <div className="text-3xl font-bold text-purple-500">
                        {metrics.riskRewardRatio.toFixed(2)}
                    </div>
                </div>

                {/* Best/Worst Pairs */}
                <div className="bg-[#2A2B33] rounded-lg p-4 col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Currency Pair Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm text-gray-400 mb-2">Top Performers</h4>
                            {metrics.bestPairs.map(([pair, profit]) => (
                                <div key={pair} className="flex justify-between mb-2">
                                    <span>{pair}</span>
                                    <span className="text-green-500">+${profit.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 className="text-sm text-gray-400 mb-2">Underperformers</h4>
                            {metrics.worstPairs.map(([pair, profit]) => (
                                <div key={pair} className="flex justify-between mb-2">
                                    <span>{pair}</span>
                                    <span className="text-red-500">${profit.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Profit Factor */}
                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Profit Factor</h3>
                    <div className="text-3xl font-bold text-yellow-500">
                        {metrics.profitFactor.toFixed(2)}
                    </div>
                </div>

                {/* Charts Row */}
                <div className="bg-[#2A2B33] rounded-lg p-4 col-span-3">
                    <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
                    <div className="grid grid-cols-2 gap-4 h-[300px]">
                        {/* P&L Chart */}
                        <ResponsiveContainer>
                            <AreaChart
                                data={trades}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="closeTime" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#8884d8"
                                    fill="#8884d8"
                                />
                            </AreaChart>
                        </ResponsiveContainer>

                        {/* Trade Distribution */}
                        <ResponsiveContainer>
                            <BarChart
                                data={trades}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="closeTime" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="profit" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Metrics Row */}
                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Max Drawdown</h3>
                    <div className="text-3xl font-bold text-red-500">
                        ${Math.abs(metrics.maxDrawdown).toFixed(2)}
                    </div>
                </div>

                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Sharpe Ratio</h3>
                    <div className="text-3xl font-bold text-indigo-500">
                        {metrics.sharpeRatio.toFixed(2)}
                    </div>
                </div>

                <div className="bg-[#2A2B33] rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">Avg Profit/Trade</h3>
                    <div className="text-3xl font-bold text-cyan-500">
                        ${metrics.avgProfitPerTrade.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradingAnalytics;

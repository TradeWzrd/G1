import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, X, Edit2, RefreshCw } from 'lucide-react';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [equityHistory, setEquityHistory] = useState([]);
    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0
    });

    // WebSocket connection setup...

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-gray-400">Track and manage your trades</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className={`px-3 py-1 rounded-full ${eaConnected ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {eaConnected ? 'EA Active' : 'EA Inactive'}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance Card */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400">Balance</h3>
                            <p className="text-2xl font-bold">${accountData?.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-green-500/20 p-2 rounded-lg">
                            <TrendingUp className="text-green-500" />
                        </div>
                    </div>
                    <div className="text-sm text-green-500">
                        +{((accountData?.equity - accountData?.balance) || 0).toFixed(2)} (24h)
                    </div>
                </div>

                {/* Equity Card */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400">Equity</h3>
                            <p className="text-2xl font-bold">${accountData?.equity?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <RefreshCw className="text-blue-500" />
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={equityHistory}>
                            <Line 
                                type="monotone" 
                                dataKey="equity" 
                                stroke="#3B82F6" 
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Free Margin Card */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-gray-400">Free Margin</h3>
                            <p className="text-2xl font-bold">${accountData?.freeMargin?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">
                        Used: ${(accountData?.margin || 0).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Trading Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Order */}
                <div className="bg-[#1A1A1A] p-6 rounded-xl">
                    <h3 className="text-xl font-bold mb-4">New Order</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={newOrder.symbol}
                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                            className="w-full bg-[#2A2A2A] border-0 rounded-lg p-3 text-white"
                            placeholder="Symbol"
                        />
                        <input
                            type="number"
                            step="0.01"
                            value={newOrder.lots}
                            onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                            className="w-full bg-[#2A2A2A] border-0 rounded-lg p-3 text-white"
                            placeholder="Lots"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                step="0.00001"
                                value={newOrder.stopLoss}
                                onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                className="w-full bg-[#2A2A2A] border-0 rounded-lg p-3 text-white"
                                placeholder="Stop Loss"
                            />
                            <input
                                type="number"
                                step="0.00001"
                                value={newOrder.takeProfit}
                                onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                className="w-full bg-[#2A2A2A] border-0 rounded-lg p-3 text-white"
                                placeholder="Take Profit"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => executeTrade(0)}
                                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-500 p-3 rounded-lg flex items-center justify-center gap-2"
                            >
                                <TrendingUp size={20} />
                                Buy
                            </button>
                            <button
                                onClick={() => executeTrade(1)}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-500 p-3 rounded-lg flex items-center justify-center gap-2"
                            >
                                <TrendingDown size={20} />
                                Sell
                            </button>
                        </div>
                    </div>
                </div>

                {/* Open Positions */}
                <div className="lg:col-span-2 bg-[#1A1A1A] p-6 rounded-xl overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Open Positions</h3>
                        <div className="space-x-2">
                            <button 
                                onClick={() => handleCloseAll()}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-500 px-4 py-2 rounded-lg"
                            >
                                Close All
                            </button>
                        </div>
                    </div>
                    <table className="w-full min-w-[600px]">
                        <thead className="text-gray-400">
                            <tr>
                                <th className="text-left py-2">Symbol</th>
                                <th className="text-left py-2">Type</th>
                                <th className="text-right py-2">Lots</th>
                                <th className="text-right py-2">Open Price</th>
                                <th className="text-right py-2">Profit</th>
                                <th className="text-right py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((position) => (
                                <tr key={position.ticket} className="border-t border-[#2A2A2A]">
                                    <td className="py-3">{position.symbol}</td>
                                    <td className={position.type === 0 ? 'text-green-500' : 'text-red-500'}>
                                        {position.type === 0 ? 'Buy' : 'Sell'}
                                    </td>
                                    <td className="text-right">{position.lots.toFixed(2)}</td>
                                    <td className="text-right">{position.openPrice.toFixed(5)}</td>
                                    <td className={`text-right ${position.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {position.profit.toFixed(2)}
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => handleClosePosition(position.ticket)}
                                            className="bg-red-500/20 hover:bg-red-500/30 text-red-500 p-2 rounded-lg ml-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WebTerminal;

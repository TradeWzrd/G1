import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Server, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Dashboard = ({ accountData, equityHistory, positions = [] }) => {
    return (
        <div className="p-4 space-y-6 bg-black text-white">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { title: 'Balance', value: accountData?.balance || 0 },
                    { title: 'Equity', value: accountData?.equity || 0 },
                    { title: 'Margin', value: accountData?.margin || 0 },
                    { title: 'Free Margin', value: accountData?.freeMargin || 0 }
                ].map((stat) => (
                    <Card key={stat.title} className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                        <CardHeader className="flex justify-between items-center">
                            <CardTitle className="text-xs text-gray-400">{stat.title}</CardTitle>
                            <Wallet className="w-4 h-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">
                                ${stat.value.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Main Chart */}
                <Card className="bg-gray-900 rounded-lg col-span-8 p-4 border border-gray-800">
                    <CardHeader>
                        <CardTitle>Balance & Equity Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={equityHistory}>
                                    <defs>
                                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#374151" />
                                    <YAxis stroke="#374151" tickFormatter={(value) => `$${value}`} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(17, 24, 39, 0.8)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#3B82F6"
                                        fillOpacity={1}
                                        fill="url(#balanceGradient)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="equity"
                                        stroke="#8B5CF6"
                                        fillOpacity={1}
                                        fill="url(#equityGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Info */}
                <Card className="bg-gray-900 rounded-lg col-span-4 p-4 border border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <div className="text-gray-400 text-xs">Account Number</div>
                            <div className="text-lg">{accountData?.number || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs">Leverage</div>
                            <div className="text-lg">{accountData?.leverage || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs">Server</div>
                            <div className="text-lg">{accountData?.server || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-gray-400 text-xs">Currency</div>
                            <div className="text-lg">{accountData?.currency || 'USD'}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Trades */}
                <Card className="bg-gray-900 rounded-lg col-span-12 p-4 border border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Recent Trades
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-gray-400">
                                        <th className="p-2">Ticket</th>
                                        <th className="p-2">Symbol</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Lots</th>
                                        <th className="p-2">Open Price</th>
                                        <th className="p-2">Current Price</th>
                                        <th className="p-2">SL/TP</th>
                                        <th className="p-2">Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.slice(0, 5).map((trade) => (
                                        <tr key={trade.ticket} className="border-t border-gray-800">
                                            <td className="p-2">{trade.ticket}</td>
                                            <td className="p-2">{trade.symbol}</td>
                                            <td className={`p-2 ${trade.type === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {trade.type === 0 ? 'Buy' : 'Sell'}
                                            </td>
                                            <td className="p-2">{trade.lots}</td>
                                            <td className="p-2">{trade.openPrice}</td>
                                            <td className="p-2">{trade.currentPrice}</td>
                                            <td className="p-2">
                                                {trade.stopLoss}/{trade.takeProfit}
                                            </td>
                                            <td className={`p-2 ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${trade.profit.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
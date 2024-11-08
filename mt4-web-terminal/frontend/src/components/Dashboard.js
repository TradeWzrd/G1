import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Server, Wallet, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';

const Dashboard = ({ accountData, equityHistory, positions = [] }) => {
    // Helper function to format time
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString();
    };

    return (
        <div className="p-6 space-y-6 animate-blur-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { title: 'Balance', value: accountData?.balance || 0, icon: Wallet },
                    { title: 'Equity', value: accountData?.equity || 0, icon: Wallet },
                    { title: 'Margin', value: accountData?.margin || 0, icon: Wallet },
                    { title: 'Free Margin', value: accountData?.freeMargin || 0, icon: Wallet }
                ].map((stat) => (
                    <Card key={stat.title} className="glass-effect">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm text-gray-400">{stat.title}</CardTitle>
                            <stat.icon className="w-4 h-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">
                                ${stat.value.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Main Chart */}
                <Card className="glass-effect col-span-8">
                    <CardHeader>
                        <CardTitle>Balance & Equity Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={equityHistory}>
                                    <defs>
                                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
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
                <Card className="glass-effect col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col space-y-1">
                            <span className="text-sm text-gray-400">Account Number</span>
                            <span className="text-lg font-medium">{accountData?.number || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-sm text-gray-400">Leverage</span>
                            <span className="text-lg font-medium">{accountData?.leverage || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-sm text-gray-400">Server</span>
                            <span className="text-lg font-medium">{accountData?.server || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-sm text-gray-400">Currency</span>
                            <span className="text-lg font-medium">{accountData?.currency || 'USD'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Trades */}
                <Card className="glass-effect col-span-12">
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
                                    <tr className="text-left text-sm text-gray-400">
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
                                        <tr key={trade.ticket} className="border-t border-white/5">
                                            <td className="p-2">{trade.ticket}</td>
                                            <td className="p-2 font-medium">{trade.symbol}</td>
                                            <td className="p-2">
                                                <div className={`flex items-center gap-1 ${trade.type === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {trade.type === 0 ? 
                                                        <ArrowUpRight className="w-4 h-4" /> : 
                                                        <ArrowDownRight className="w-4 h-4" />
                                                    }
                                                    {trade.type === 0 ? 'Buy' : 'Sell'}
                                                </div>
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
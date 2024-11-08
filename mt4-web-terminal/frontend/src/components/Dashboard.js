import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    LineChart, 
    Users, 
    CreditCard, 
    ArrowUpRight, 
    ArrowDownRight,
    Server,
    Wallet,
    Activity 
} from 'lucide-react';

const Dashboard = ({ accountData, equityHistory }) => {
    // Helper function to safely get numeric values
    const getStatValue = (value) => {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
    };

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { title: 'Balance', value: getStatValue(accountData?.balance), Icon: Wallet },
                    { title: 'Equity', value: getStatValue(accountData?.equity), Icon: CreditCard },
                    { title: 'Margin', value: getStatValue(accountData?.margin), Icon: Activity },
                    { title: 'Free Margin', value: getStatValue(accountData?.freeMargin), Icon: LineChart }
                ].map((stat) => (
                    <div key={stat.title} className="bg-[#111827] rounded-lg p-4 border border-[#1f2937]">
                        <div className="flex justify-between items-start">
                            <div className="text-gray-400 text-xs">{stat.title}</div>
                            <stat.Icon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="text-2xl font-bold mt-1">${stat.value.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Balance & Equity Chart */}
                <div className="col-span-8 bg-[#111827] rounded-lg p-4 border border-[#1f2937]">
                    <h2 className="text-lg font-bold mb-4">Balance & Equity Overview</h2>
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
                                <XAxis dataKey="time" stroke="#4B5563" />
                                <YAxis stroke="#4B5563" tickFormatter={(value) => `$${value}`} />
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: 'rgba(17, 24, 39, 0.8)',
                                        border: '1px solid rgba(75, 85, 99, 0.2)',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#3B82F6"
                                    fill="url(#balanceGradient)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="equity"
                                    stroke="#8B5CF6"
                                    fill="url(#equityGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Account Information */}
                <div className="col-span-4 bg-[#111827] rounded-lg p-4 border border-[#1f2937]">
                    <div className="flex items-center gap-2 mb-4">
                        <Server className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-bold">Account Information</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { label: 'Account Number', value: accountData?.number },
                            { label: 'Leverage', value: accountData?.leverage },
                            { label: 'Server', value: accountData?.server },
                            { label: 'Currency', value: accountData?.currency }
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="text-gray-400 text-xs">{item.label}</div>
                                <div className="text-lg">{item.value || 'N/A'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Trades */}
            <div className="col-span-12 bg-[#111827] rounded-lg p-4 border border-[#1f2937]">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-bold">Recent Trades</h2>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="text-gray-400 text-sm">
                            <th className="text-left p-2">Ticket</th>
                            <th className="text-left p-2">Symbol</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Lots</th>
                            <th className="text-right p-2">Open Price</th>
                            <th className="text-right p-2">SL/TP</th>
                            <th className="text-right p-2">Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accountData?.positions?.map((trade) => (
                            <tr key={trade.ticket} className="border-t border-[#1f2937]">
                                <td className="p-2">{trade.ticket}</td>
                                <td className="p-2">{trade.symbol}</td>
                                <td className={`p-2 ${trade.type === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {trade.type === 0 ? 'Buy' : 'Sell'}
                                </td>
                                <td className="p-2">{trade.lots}</td>
                                <td className="p-2 text-right">{trade.openPrice}</td>
                                <td className="p-2 text-right">{trade.stopLoss}/{trade.takeProfit}</td>
                                <td className={`p-2 text-right ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${(trade.profit || 0).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
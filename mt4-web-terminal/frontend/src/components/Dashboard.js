import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
    LineChart, 
    Users, 
    CreditCard, 
    ArrowUpRight, 
    ArrowDownRight,
    Server,
    Wallet,
    Activity,
    TrendingUp,
    DollarSign 
} from 'lucide-react';

const Dashboard = ({ accountData, equityHistory }) => {
    // Helper function to safely get numeric values
    const getStatValue = (value) => {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
    };

    // Format numbers with commas and 2 decimal places
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
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

    const stats = [
        { 
            title: 'Balance', 
            value: getStatValue(accountData?.balance), 
            Icon: Wallet,
            color: 'text-blue-500',
            bgGradient: 'from-blue-500/10 to-transparent'
        },
        { 
            title: 'Equity', 
            value: getStatValue(accountData?.equity), 
            Icon: CreditCard,
            color: 'text-emerald-500',
            bgGradient: 'from-emerald-500/10 to-transparent'
        },
        { 
            title: 'Margin', 
            value: getStatValue(accountData?.margin), 
            Icon: Activity,
            color: 'text-purple-500',
            bgGradient: 'from-purple-500/10 to-transparent'
        },
        { 
            title: 'Free Margin', 
            value: getStatValue(accountData?.freeMargin), 
            Icon: LineChart,
            color: 'text-amber-500',
            bgGradient: 'from-amber-500/10 to-transparent'
        }
    ];

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Trading Dashboard
                </h1>
                <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center px-3 py-1 bg-green-500/10 text-green-500 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                        Connected
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div 
                        key={stat.title}
                        className={`bg-gradient-to-br ${stat.bgGradient} bg-[#111827] rounded-xl p-6 border border-[#1f2937] transition-transform duration-200 hover:scale-105 hover:shadow-lg`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-gray-400 text-sm font-medium mb-1">{stat.title}</div>
                                <div className="text-2xl font-bold ${stat.color}">
                                    ${formatCurrency(stat.value)}
                                </div>
                            </div>
                            <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                                <stat.Icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Balance & Equity Chart */}
                <div className="col-span-12 lg:col-span-8 bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold">Balance & Equity Overview</h2>
                        <div className="flex space-x-4">
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                <span className="text-sm text-gray-400">Balance</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                                <span className="text-sm text-gray-400">Equity</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityHistory}>
                                <defs>
                                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
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
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#3B82F6"
                                    fillOpacity={1}
                                    fill="url(#balanceGradient)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="equity"
                                    stroke="#10B981"
                                    fillOpacity={1}
                                    fill="url(#equityGradient)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Stats */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Profit/Loss', value: getStatValue(accountData?.profit), Icon: TrendingUp },
                                { label: 'Open Positions', value: getStatValue(accountData?.openPositions), Icon: LineChart },
                                { label: 'Used Margin %', value: (getStatValue(accountData?.margin) / getStatValue(accountData?.balance) * 100).toFixed(2) + '%', Icon: DollarSign }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <item.Icon className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <span className="text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="font-semibold">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
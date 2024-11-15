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

const Dashboard = ({ accountData, equityHistory, connected, eaConnected }) => {
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

    // Calculate profit/loss
    const balance = getStatValue(accountData?.balance);
    const equity = getStatValue(accountData?.equity);
    const pnl = equity - balance;
    const pnlPercentage = balance !== 0 ? (pnl / balance) * 100 : 0;

    const stats = [
        { 
            title: 'Balance', 
            value: accountData?.balance || 0,
            icon: Wallet,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
        },
        { 
            title: 'Equity', 
            value: accountData?.equity || 0,
            icon: DollarSign,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20'
        },
        { 
            title: 'Margin', 
            value: accountData?.margin || 0,
            icon: Activity,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20'
        },
        { 
            title: 'Free Margin', 
            value: accountData?.freeMargin || 0,
            icon: TrendingUp,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20'
        }
    ];

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Trading Dashboard
                    </h1>
                    <p className="text-sm text-gray-400">Real-time account overview and analytics</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${eaConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${eaConnected ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>
                        {eaConnected ? 'EA Connected' : 'EA Disconnected'}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div
                        key={stat.title}
                        className={`p-6 rounded-xl border ${stat.borderColor} ${stat.bgColor} backdrop-blur-xl`}
                    >
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <h3 className="text-sm font-medium text-gray-400">{stat.title}</h3>
                            </div>
                            <div className="flex items-baseline">
                                <span className="text-2xl font-bold text-white">
                                    ${formatCurrency(stat.value)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-[#2a3441] bg-[#1a1f2e] p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white">Equity Chart</h2>
                        <p className="text-sm text-gray-400">Real-time equity performance</p>
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-lg text-sm
                        ${pnl >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <span className="font-medium">
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercentage.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityHistory}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3441" />
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
                                dataKey="value"
                                stroke="#3B82F6"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
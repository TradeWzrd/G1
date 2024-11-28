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
    DollarSign,
    PieChart,
    BarChart2,
    Clock,
    RefreshCw
} from 'lucide-react';
import ForexSessionsMap from './ForexSessionsMap';

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
            borderColor: 'border-blue-500/20',
            change: '+2.5%',
            changeType: 'positive'
        },
        { 
            title: 'Equity', 
            value: accountData?.equity || 0,
            icon: DollarSign,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
            change: '+1.8%',
            changeType: 'positive'
        },
        { 
            title: 'Margin', 
            value: accountData?.margin || 0,
            icon: Activity,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20',
            change: '-0.5%',
            changeType: 'negative'
        },
        { 
            title: 'Free Margin', 
            value: accountData?.freeMargin || 0,
            icon: TrendingUp,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
            change: '+1.2%',
            changeType: 'positive'
        }
    ];

    return (
        <div className="p-6 space-y-6 bg-[#0A0B0D] bg-gradient-to-b from-[#0A0B0D] to-[#12131A] text-white min-h-screen">
            {/* Header with Status */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        My Balance
                    </h1>
                    <div className="flex items-center mt-1 space-x-2">
                        <p className="text-sm text-[#737373]">Based on recent 24 hours</p>
                        <div className="flex items-center space-x-2">
                            <button className="px-2 py-1 text-xs rounded-md bg-[#FFFFFF0A] text-[#737373] hover:bg-[#FFFFFF14] transition-colors">
                                24h
                            </button>
                            <button className="p-1 rounded-md hover:bg-[#FFFFFF0A] transition-colors">
                                <RefreshCw className="w-4 h-4 text-[#737373]" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1.5 rounded-full text-xs ${
                        connected 
                            ? 'bg-[#10B98110] text-[#10B981]' 
                            : 'bg-[#EF444410] text-[#EF4444]'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            connected 
                                ? 'bg-[#10B981]' 
                                : 'bg-[#EF4444]'
                        }`}></div>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className={`flex items-center px-3 py-1.5 rounded-full text-xs ${
                        eaConnected 
                            ? 'bg-[#3B82F610] text-[#3B82F6]' 
                            : 'bg-[#FFFFFF0A] text-[#737373]'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            eaConnected 
                                ? 'bg-[#3B82F6]' 
                                : 'bg-[#737373]'
                        }`}></div>
                        EA {eaConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} 
                         className="p-6 rounded-2xl border border-[#FFFFFF1A] bg-[#12131A] hover:bg-[#1A1B23] transition-all duration-300
                                  shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-[#1A1B23]">
                                <stat.icon className="w-5 h-5 text-[#3B82F6]" />
                            </div>
                            <div className={`px-2 py-1 rounded-md text-xs ${
                                stat.changeType === 'positive' 
                                    ? 'bg-[#10B98110] text-[#10B981]' 
                                    : 'bg-[#EF444410] text-[#EF4444]'
                            }`}>
                                {stat.change}
                            </div>
                        </div>
                        <h3 className="text-[#737373] text-sm mb-1">{stat.title}</h3>
                        <p className="text-xl font-bold text-white">${formatCurrency(stat.value)}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Equity Chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl border border-[#FFFFFF1A] bg-[#12131A] shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-semibold text-white">Equity Performance</h3>
                            <p className="text-xs text-[#737373] mt-1">6.89% more than last week period</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="px-3 py-1.5 text-xs rounded-md bg-[#3B82F610] text-[#3B82F6]">1H</button>
                            <button className="px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF0A] text-[#737373] hover:bg-[#FFFFFF14] transition-colors">1D</button>
                            <button className="px-3 py-1.5 text-xs rounded-md bg-[#FFFFFF0A] text-[#737373] hover:bg-[#FFFFFF14] transition-colors">1W</button>
                        </div>
                    </div>
                    <div className="h-[300px] relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#3B82F6]/5 to-transparent rounded-lg"></div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityHistory}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF0A" />
                                <XAxis 
                                    dataKey="time" 
                                    stroke="#FFFFFF14"
                                    tick={{ fill: '#737373', fontSize: 12 }}
                                    axisLine={{ stroke: '#FFFFFF0A' }}
                                />
                                <YAxis 
                                    stroke="#FFFFFF14"
                                    tick={{ fill: '#737373', fontSize: 12 }}
                                    axisLine={{ stroke: '#FFFFFF0A' }}
                                />
                                <Tooltip content={CustomTooltip} />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3B82F6" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorEquity)"
                                    filter="url(#glow)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Forex Sessions Map */}
                <div className="p-6 rounded-2xl border border-[#FFFFFF1A] bg-[#12131A] shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-semibold text-white">Market Sessions</h3>
                            <p className="text-xs text-[#737373] mt-1">Active trading sessions</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ForexSessionsMap />
                    </div>
                </div>
            </div>

            {/* Trading Activity */}
            <div className="mt-6">
                <div className="p-6 rounded-2xl border border-[#FFFFFF1A] bg-[#12131A] shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-white">Trading Activity</h3>
                        <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-[#737373]" />
                            <span className="text-xs text-[#737373]">Last 24h</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[#1A1B23] hover:bg-[#1A1B23] transition-all duration-300">
                            <div className="flex items-center space-x-3">
                                <div className="bg-[#10B98110] p-2 rounded-xl">
                                    <ArrowUpRight className="w-4 h-4 text-[#10B981]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Buy EURUSD</p>
                                    <p className="text-xs text-[#737373]">0.01 Lots</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-[#10B981]">+$2.35</p>
                                <p className="text-xs text-[#737373]">12:45 PM</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
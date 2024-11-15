import React from 'react';
import { LayoutDashboard, LineChart, Menu, Activity, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { 
            name: 'Dashboard', 
            icon: <LayoutDashboard className="w-5 h-5" />, 
            path: '/',
            description: 'Overview and Analytics'
        },
        { 
            name: 'Trading', 
            icon: <LineChart className="w-5 h-5" />, 
            path: '/trading',
            description: 'Execute Trades'
        },
        { 
            name: 'Performance', 
            icon: <Activity className="w-5 h-5" />, 
            path: '/performance',
            description: 'Trading Statistics'
        }
    ];

    return (
        <div className="flex h-screen bg-[#0a0f1a]">
            {/* Sidebar */}
            <div className="w-72 bg-[#111827] border-r border-[#1f2937]">
                {/* Logo Section */}
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        MT4 Terminal
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Professional Trading Platform</p>
                </div>

                {/* Navigation */}
                <nav className="mt-6 px-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-4 p-3 mb-2 rounded-lg transition-all duration-200
                                ${location.pathname === item.path 
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                                    : 'text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200'}`}
                        >
                            <div className={`p-2 rounded-lg ${location.pathname === item.path ? 'bg-blue-500/10' : 'bg-[#1a1f2e]'}`}>
                                {item.icon}
                            </div>
                            <div className="text-left">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.description}</div>
                            </div>
                        </button>
                    ))}
                </nav>

                {/* Bottom Section */}
                <div className="absolute bottom-0 w-72 p-6 border-t border-[#1f2937]">
                    <div className="flex items-center gap-3 text-gray-400 hover:text-gray-200 transition-colors">
                        <div className="p-2 rounded-lg bg-[#1a1f2e]">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-medium">Settings</div>
                            <div className="text-xs text-gray-500">Platform Configuration</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
};

export default Layout;
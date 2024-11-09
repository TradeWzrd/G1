import React from 'react';
import { LayoutDashboard, LineChart, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/' },
        { name: 'Trading', icon: <LineChart className="w-4 h-4" />, path: '/trading' }
    ];

    return (
        <div className="flex h-screen bg-[#0A0A0A]">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 glass-effect">
                <div className="p-4">
                    <h1 className="text-xl font-bold text-gradient">MT4 Terminal</h1>
                </div>
                <nav className="mt-4">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm 
                                ${location.pathname === item.path 
                                    ? 'bg-white/10 text-white' 
                                    : 'text-gray-400 hover:bg-white/5'}`}
                        >
                            {item.icon}
                            {item.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
};

export default Layout;
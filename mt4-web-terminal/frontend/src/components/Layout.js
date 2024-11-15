import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, LineChart } from 'lucide-react';

const Layout = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div className="flex min-h-screen bg-[#0a0f1a]">
            {/* Sidebar */}
            <div className="w-64 bg-[#1a1f2e] border-r border-[#2a3441]">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        MT4 Terminal
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Professional Trading Platform</p>
                </div>
                <nav className="mt-6">
                    <Link
                        to="/"
                        className={`flex items-center px-6 py-3 text-gray-300 hover:bg-[#111827] transition-colors duration-200
                            ${isActive('/') ? 'bg-[#111827] text-white border-r-4 border-blue-500' : ''}`}
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link
                        to="/terminal"
                        className={`flex items-center px-6 py-3 text-gray-300 hover:bg-[#111827] transition-colors duration-200
                            ${isActive('/terminal') ? 'bg-[#111827] text-white border-r-4 border-blue-500' : ''}`}
                    >
                        <LineChart className="w-5 h-5 mr-3" />
                        Terminal
                    </Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
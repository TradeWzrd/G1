import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart } from 'lucide-react';

const Layout = () => {
  return (
    <div className="flex h-screen bg-[#0a0f1a]">
      {/* Sidebar */}
      <div className="w-64 bg-[#111827] border-r border-gray-800">
        <div className="p-4">
          <h1 className="text-xl font-bold text-white">MT4 Terminal</h1>
        </div>
        <nav className="mt-6">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive 
                  ? 'bg-[#1f2937] text-white border-l-2 border-blue-500' 
                  : 'text-gray-400 hover:bg-[#1f2937] hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink
            to="/trading"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive 
                  ? 'bg-[#1f2937] text-white border-l-2 border-blue-500' 
                  : 'text-gray-400 hover:bg-[#1f2937] hover:text-white'
              }`
            }
          >
            <LineChart size={20} />
            Trading
          </NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-[#0a0f1a]">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
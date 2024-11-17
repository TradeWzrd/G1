import React, { createContext, useContext, useState } from 'react';
import { 
    Home, 
    LayoutDashboard, 
    LineChart, 
    Activity, 
    Settings, 
    ChevronFirst, 
    ChevronLast, 
    MoreVertical,
    BookOpen,
    History,
    Bell,
    HelpCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const SidebarContext = createContext();

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = useState(true);

    const menuItems = [
        { 
            name: 'Home', 
            icon: <Home className="w-5 h-5" />, 
            path: '/',
            description: 'Overview',
            alert: false
        },
        { 
            name: 'Trading', 
            icon: <LineChart className="w-5 h-5" />, 
            path: '/trading',
            description: 'Execute Trades',
            alert: true
        },
        { 
            name: 'Analytics', 
            icon: <Activity className="w-5 h-5" />, 
            path: '/analytics',
            description: 'Performance Metrics',
            alert: false
        },
        { 
            name: 'History', 
            icon: <History className="w-5 h-5" />, 
            path: '/history',
            description: 'Trade History'
        },
        { 
            name: 'Journal', 
            icon: <BookOpen className="w-5 h-5" />, 
            path: '/journal',
            description: 'Trading Journal'
        },
        { 
            name: 'Notifications', 
            icon: <Bell className="w-5 h-5" />, 
            path: '/notifications',
            description: 'Alerts & Messages',
            alert: true
        }
    ];

    const bottomMenuItems = [
        {
            name: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            path: '/settings',
            description: 'Platform Settings'
        },
        {
            name: 'Help',
            icon: <HelpCircle className="w-5 h-5" />,
            path: '/help',
            description: 'Support & Documentation'
        }
    ];

    return (
        <div className="flex h-screen bg-[#0A0B0D]">
            {/* Sidebar */}
            <aside className={`h-screen transition-all duration-300 ease-in-out ${expanded ? "w-72" : "w-20"}`}>
                <nav className="h-full flex flex-col bg-[#12131A] border-r border-[#FFFFFF1A] shadow-sm relative">
                    {/* Logo Section */}
                    <div className={`
                        p-4 pb-2 border-b border-[#FFFFFF1A]
                        ${expanded ? "flex justify-between items-center" : "flex justify-center"}
                    `}>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? "w-48 opacity-100" : "w-0 opacity-0"}`}>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-[#10B981] to-[#3B82F6] bg-clip-text text-transparent whitespace-nowrap">
                                Trade Wzrd
                            </h1>
                            <p className="text-xs text-[#737373] whitespace-nowrap">Professional Trading Platform</p>
                        </div>
                        <button 
                            onClick={() => setExpanded((curr) => !curr)} 
                            className={`
                                p-1.5 rounded-lg bg-[#1A1B23] hover:bg-[#1A1B23] text-[#B3B3B3] hover:text-white
                                transition-all duration-300 ease-in-out
                            `}
                        >
                            {expanded ? <ChevronFirst size={20} /> : <ChevronLast size={20} />}
                        </button>
                    </div>

                    {/* Navigation */}
                    <SidebarContext.Provider value={{ expanded }}>
                        <div className="flex-1 px-3 py-3">
                            {menuItems.map((item) => (
                                <SidebarItem
                                    key={item.name}
                                    icon={item.icon}
                                    text={item.name}
                                    description={item.description}
                                    active={location.pathname === item.path}
                                    alert={item.alert}
                                    onClick={() => navigate(item.path)}
                                />
                            ))}
                            <div className="h-px bg-[#FFFFFF1A] my-3" />
                            {bottomMenuItems.map((item) => (
                                <SidebarItem
                                    key={item.name}
                                    icon={item.icon}
                                    text={item.name}
                                    description={item.description}
                                    active={location.pathname === item.path}
                                    onClick={() => navigate(item.path)}
                                />
                            ))}
                        </div>
                    </SidebarContext.Provider>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
};

const SidebarItem = ({ icon, text, description, active, alert, onClick }) => {
    const { expanded } = useContext(SidebarContext);
    
    return (
        <button
            onClick={onClick}
            className="w-full relative group"
        >
            <div className={`
                flex items-center rounded-lg transition-all duration-200
                ${expanded ? "p-2 justify-start" : "p-2 justify-center"}
                ${active 
                    ? 'bg-[#10B98110] text-[#10B981] border border-[#10B98120]' 
                    : 'text-[#B3B3B3] hover:bg-[#1A1B23] hover:text-white'}
            `}>
                <div className={`
                    relative flex items-center justify-center rounded-lg
                    ${expanded ? 'w-10 h-10' : 'w-10 h-10'}
                    ${active ? 'bg-[#10B98110]' : 'bg-[#1A1B23]'}
                `}>
                    {icon}
                    {alert && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981]" />
                    )}
                </div>
                
                <div className={`
                    text-left overflow-hidden transition-all duration-300 ease-in-out
                    ${expanded ? "ml-3 w-52 opacity-100" : "w-0 opacity-0"}
                `}>
                    <div className="font-medium whitespace-nowrap">{text}</div>
                    <div className="text-xs text-[#737373] whitespace-nowrap">{description}</div>
                </div>
            </div>

            {!expanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 rounded-md px-3 py-2 ml-3 bg-[#1A1B23] text-white text-sm invisible opacity-0 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap z-50 border border-[#FFFFFF1A]">
                    <div className="font-medium">{text}</div>
                    <div className="text-xs text-[#737373]">{description}</div>
                </div>
            )}
        </button>
    );
};

export default Layout;
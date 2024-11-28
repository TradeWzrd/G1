import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

const geoUrl = "https://unpkg.com/world-atlas@2/countries-110m.json";

// Updated session times based on FAQ
const sessions = [
    {
        name: 'Sydney',
        coordinates: [151.2093, -33.8688],
        time: '21:00-06:00',
        start: 21,
        end: 6,
        color: '#10B981',
        hexColor: '#10B981',
        gradient: 'from-emerald-500/20 to-emerald-500/5'
    },
    {
        name: 'Tokyo',
        coordinates: [139.6917, 35.6895],
        time: '00:00-09:00',
        start: 0,
        end: 9,
        color: '#3B82F6',
        hexColor: '#3B82F6',
        gradient: 'from-blue-500/20 to-blue-500/5'
    },
    {
        name: 'London',
        coordinates: [-0.1276, 51.5074],
        time: '07:00-16:00',
        start: 7,
        end: 16,
        color: '#6366F1',
        hexColor: '#6366F1',
        gradient: 'from-indigo-500/20 to-indigo-500/5'
    },
    {
        name: 'New York',
        coordinates: [-74.0059, 40.7128],
        time: '13:00-22:00',
        start: 13,
        end: 22,
        color: '#EC4899',
        hexColor: '#EC4899',
        gradient: 'from-pink-500/20 to-pink-500/5'
    }
];

const ForexSessionsMap = () => {
    const [activeSession, setActiveSession] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timelinePosition, setTimelinePosition] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            
            // Calculate timeline position based on current hour
            const hour = now.getUTCHours();
            const minute = now.getUTCMinutes();
            const position = ((hour + minute / 60) / 24) * 100;
            setTimelinePosition(position);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Get user's timezone offset
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userOffset = new Date().getTimezoneOffset();
    const userOffsetHours = -userOffset / 60; // Convert to hours and invert (getTimezoneOffset returns opposite sign)

    // Convert UTC time to local time
    const convertToLocalTime = (utcHour) => {
        let localHour = (utcHour + userOffsetHours);
        
        // Handle day boundary crossings
        if (localHour < 0) localHour += 24;
        if (localHour >= 24) localHour -= 24;
        
        return localHour;
    };

    // Format time with AM/PM
    const formatTime = (hour) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        let formattedHour = hour % 12 || 12;
        
        // Check if the hour is a decimal
        if (Number.isInteger(formattedHour)) {
            return `${formattedHour}${period}`;
        } else {
            // Convert decimal .5 to :30
            formattedHour = Math.floor(formattedHour);
            return `${formattedHour}:30${period}`;
        }
    };

    // Update session times to show local time
    const getLocalSessionTime = (utcStart, utcEnd) => {
        const localStart = convertToLocalTime(utcStart);
        const localEnd = convertToLocalTime(utcEnd);
        return `${formatTime(localStart)}-${formatTime(localEnd)}`;
    };

    const isSessionActive = (sessionTime) => {
        const [start, end] = sessionTime.split('-');
        const hour = currentTime.getUTCHours();
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);

        if (startHour < endHour) {
            return hour >= startHour && hour < endHour;
        } else {
            return hour >= startHour || hour < endHour;
        }
    };

    const getCurrentSessions = () => {
        const hour = new Date().getUTCHours();
        const activeSessions = [];
        
        // Check all active sessions
        if (hour >= 21 || hour < 6) {
            activeSessions.push({
                name: 'Sydney',
                time: '21:00-06:00',
                color: 'emerald-500',
                isActive: true
            });
        }
        if (hour >= 0 && hour < 9) {
            activeSessions.push({
                name: 'Tokyo',
                time: '00:00-09:00',
                color: 'blue-500',
                isActive: true
            });
        }
        if (hour >= 7 && hour < 16) {
            activeSessions.push({
                name: 'London',
                time: '07:00-16:00',
                color: 'indigo-500',
                isActive: true
            });
        }
        if (hour >= 13 && hour < 22) {
            activeSessions.push({
                name: 'New York',
                time: '13:00-22:00',
                color: 'pink-500',
                isActive: true
            });
        }

        // Get the first active session for the circle color
        const primarySession = activeSessions[0] || {
            name: 'No Active Sessions',
            color: 'purple-500',
            isActive: false
        };

        // Map Tailwind color classes to hex values for tooltip text
        const colorToHex = {
            'emerald-500': '#10B981',
            'blue-500': '#3B82F6',
            'indigo-500': '#6366F1',
            'pink-500': '#EC4899',
            'purple-500': '#8B5CF6'
        };

        return {
            sessions: activeSessions.map(session => ({
                ...session,
                hexColor: colorToHex[session.color]
            })),
            bg: `bg-${primarySession.color}`,
            shadow: `shadow-[0_0_10px_${colorToHex[primarySession.color]}]`
        };
    };

    const [showTooltip, setShowTooltip] = useState(false);
    const sessionInfo = getCurrentSessions();

    // Generate volume data points for the line graph
    const generateVolumeData = () => {
        const data = [];
        const baseVolume = 0.2;  // Base volume level
        
        // Helper function to add points at volume transitions
        const addTransitionPoints = (hour, prevVolume, newVolume) => {
            if (prevVolume !== newVolume) {
                // Add two points at the transition to create a sharp corner
                data.push({ hour, volume: prevVolume });
                data.push({ hour, volume: newVolume });
            } else {
                data.push({ hour, volume: newVolume });
            }
        };

        // Start with base volume
        data.push({ hour: 0, volume: baseVolume });

        let prevVolume = baseVolume;

        for (let hour = 0; hour <= 23; hour++) {
            let currentVolume = baseVolume;
            
            // Calculate the volume for current hour
            if ((hour >= 21 && hour <= 23) || (hour >= 0 && hour < 6)) currentVolume = Math.max(currentVolume, 0.4);  // Sydney
            if (hour >= 0 && hour < 9) currentVolume = Math.max(currentVolume, 0.6);   // Tokyo
            if (hour >= 7 && hour < 16) currentVolume = Math.max(currentVolume, 0.8);  // London
            if (hour >= 13 && hour < 22) currentVolume = Math.max(currentVolume, 1);   // New York

            // Add transition points for sharp corners
            if (hour === 0 || hour === 23) {
                // Ensure start and end points are at base volume
                if (hour === 0 && currentVolume > baseVolume) {
                    data.push({ hour: 0, volume: currentVolume });
                }
                if (hour === 23) {
                    data.push({ hour: 23, volume: currentVolume });
                    data.push({ hour: 23, volume: baseVolume });
                }
            } else {
                addTransitionPoints(hour, prevVolume, currentVolume);
            }
            prevVolume = currentVolume;
        }
        
        return data;
    };

    const volumeData = generateVolumeData();
    const currentHour = new Date().getUTCHours();
    const currentVolume = volumeData.find(point => point.hour === currentHour).volume;

    // Get color based on current active sessions
    const getVolumeColor = () => {
        if (currentHour >= 21 || currentHour < 6) return '#10B981'; // Sydney - emerald
        if (currentHour >= 0 && currentHour < 9) return '#3B82F6'; // Tokyo - blue
        if (currentHour >= 7 && currentHour < 16) return '#6366F1'; // London - indigo
        if (currentHour >= 13 && currentHour < 22) return '#EC4899'; // New York - pink
        return '#10B981'; // Default to emerald
    };

    const volumeColor = currentVolume >= 0.8 ? 'text-green-400' : 
                       currentVolume >= 0.6 ? 'text-yellow-400' : 
                       'text-gray-400';

    // Generate SVG path for the line graph
    const generatePath = () => {
        const width = 100; // Use percentage
        const height = 16; // Fixed height in pixels
        const points = volumeData.map((point, index) => {
            const x = (index / (volumeData.length - 1)) * width;
            const y = height - (point.volume * height);
            return `${x},${y}`;
        });
        
        // Add first and last points at the bottom to create a filled shape
        return `M0,${height} L${points.join(' L')} L100,${height} Z`;
    };

    // Format current time with hours and minutes
    const formatCurrentTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes.toString().padStart(2, '0')}${period}`;
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ minHeight: "300px" }}>
            {/* Map Container */}
            <div className="flex-1 relative overflow-hidden">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 150,
                        center: [0, 20]
                    }}
                    style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#12131A"
                    }}
                >
                    <ZoomableGroup center={[0, 20]} zoom={1.5}>
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    if (geo.properties.name === "Antarctica") return null;
                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#1A1B23"
                                            stroke="#FFFFFF0A"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: 'none' },
                                                hover: { outline: 'none', fill: '#2D3748' },
                                                pressed: { outline: 'none' },
                                            }}
                                        />
                                    );
                                })
                            }
                        </Geographies>

                        {sessions.map(({ name, coordinates, time, color, gradient }) => {
                            const isActive = isSessionActive(time);
                            return (
                                <motion.g key={name}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Marker coordinates={coordinates}>
                                        <motion.circle
                                            r={isActive ? 25 : 8}
                                            fill={isActive ? `${color}33` : `${color}11`}
                                            stroke={color}
                                            strokeWidth={isActive ? 3 : 1}
                                            onMouseEnter={() => setActiveSession(name)}
                                            onMouseLeave={() => setActiveSession(null)}
                                            animate={{
                                                r: isActive ? [25, 30, 25] : 8,
                                                strokeWidth: isActive ? [3, 4, 3] : 1,
                                                opacity: isActive ? [1, 0.8, 1] : 0.6
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        />
                                        {isActive && (
                                            <motion.circle
                                                r={4}
                                                fill={color}
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [1, 0.8, 1]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            />
                                        )}
                                    </Marker>
                                    {(activeSession === name || isActive) && (
                                        <Marker coordinates={coordinates}>
                                            <foreignObject
                                                x={-75}
                                                y={-60}
                                                width={150}
                                                height={50}
                                                style={{ overflow: 'visible' }}
                                            >
                                                <div className={`${isActive ? 'bg-[#1A1B23] border border-[${color}33]' : 'bg-[#1A1B23]'} text-white px-3 py-2 rounded-lg shadow-lg text-center text-sm`}>
                                                    <p className="font-semibold">{name}</p>
                                                    <p className={`text-xs ${isActive ? 'text-green-400' : 'text-[#737373]'}`}>
                                                        {isActive ? 'ACTIVE' : 'INACTIVE'} • {time}
                                                    </p>
                                                </div>
                                            </foreignObject>
                                        </Marker>
                                    )}
                                </motion.g>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* Bottom Section */}
            <div className="flex-shrink-0">
                <div className="w-full h-full flex flex-col">
                    {/* Combined Volume and Timeline Component */}
                    <div className="w-full relative rounded-none overflow-hidden px-4">
                        {/* Combined Graph Container */}
                        <div className="w-full relative rounded-none overflow-hidden">
                            {/* Volume Graph */}
                            <svg 
                                width="100%" 
                                height="40" 
                                viewBox="0 0 100 40" 
                                preserveAspectRatio="none"
                                className="mb-[-8px] rounded-none" 
                            >
                                {/* Gradient and glow definitions */}
                                <defs>
                                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" /> {/* emerald */}
                                        <stop offset="30%" stopColor="rgba(59, 130, 246, 0.3)" /> {/* blue */}
                                        <stop offset="60%" stopColor="rgba(99, 102, 241, 0.3)" /> {/* indigo */}
                                        <stop offset="100%" stopColor="rgba(236, 72, 153, 0.3)" /> {/* pink */}
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Area under the line */}
                                <path
                                    d={`M0,40 
                                      L0,${40 - (volumeData[0].volume * 36)}
                                      ${volumeData.map((point, index, points) => {
                                        if (index === 0) return '';
                                        
                                        const x = (index / (points.length - 1)) * 100;
                                        const y = 40 - (point.volume * 36);
                                        
                                        // Previous point
                                        const prevX = ((index - 1) / (points.length - 1)) * 100;
                                        const prevY = 40 - (points[index - 1].volume * 36);
                                        
                                        // Control points for the curve
                                        const cx1 = prevX + (x - prevX) / 2;
                                        const cy1 = prevY;
                                        const cx2 = prevX + (x - prevX) / 2;
                                        const cy2 = y;
                                        
                                        return `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
                                      }).join(' ')}
                                      L100,40 
                                      L0,40`}
                                    fill="url(#volumeGradient)"
                                    className="transition-all duration-300"
                                    vectorEffect="non-scaling-stroke"
                                    shapeRendering="geometricPrecision"
                                />

                                {/* Line itself */}
                                <path
                                    d={`M0,${40 - (volumeData[0].volume * 36)}
                                      ${volumeData.map((point, index, points) => {
                                        if (index === 0) return '';
                                        
                                        const x = (index / (points.length - 1)) * 100;
                                        const y = 40 - (point.volume * 36);
                                        
                                        // Previous point
                                        const prevX = ((index - 1) / (points.length - 1)) * 100;
                                        const prevY = 40 - (points[index - 1].volume * 36);
                                        
                                        // Control points for the curve
                                        const cx1 = prevX + (x - prevX) / 2;
                                        const cy1 = prevY;
                                        const cx2 = prevX + (x - prevX) / 2;
                                        const cy2 = y;
                                        
                                        return `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
                                      }).join(' ')}`}
                                    fill="none"
                                    stroke="url(#volumeGradient)"
                                    strokeWidth="2"
                                    className="transition-all duration-300"
                                    vectorEffect="non-scaling-stroke"
                                    filter="url(#glow)"
                                    shapeRendering="geometricPrecision"
                                />

                                {/* Current time indicator line */}
                                <line
                                    x1={`${(currentHour / 23) * 100}`}
                                    y1="0"
                                    x2={`${(currentHour / 23) * 100}`}
                                    y2="40"
                                    stroke={getVolumeColor()}
                                    strokeWidth="1.5"
                                    strokeDasharray="2,2"
                                    opacity="0.5"
                                    vectorEffect="non-scaling-stroke"
                                    filter="url(#glow)"
                                />
                            </svg>

                            {/* Timeline */}
                            <div className="w-full h-4 relative flex items-center">
                                {/* Base line with gradient - unfulfilled part */}
                                <div className="w-full h-[2px] bg-gradient-to-r from-emerald-500/30 via-blue-500/30 via-indigo-500/30 to-pink-500/30"></div>

                                {/* Fulfilled timeline with enhanced glow */}
                                <div 
                                    className="absolute h-[2px] bg-gradient-to-r from-emerald-500 via-blue-500 via-indigo-500 to-pink-500 z-10"
                                    style={{ 
                                        width: `${timelinePosition}%`,
                                        boxShadow: '0 0 8px rgba(99, 102, 241, 0.6), 0 0 12px rgba(236, 72, 153, 0.4)',
                                        filter: 'brightness(1.2) contrast(1.1)',
                                        opacity: 0.9
                                    }}
                                ></div>

                                {/* Current time indicator */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 z-20 group"
                                    style={{ 
                                        left: `${timelinePosition}%`,
                                    }}
                                >
                                    <div 
                                        className={`w-3 h-3 rounded-full bg-white cursor-pointer relative`}
                                        style={{
                                            boxShadow: '0 0 10px rgba(99, 102, 241, 0.7), 0 0 15px rgba(236, 72, 153, 0.5)',
                                            filter: 'brightness(1.2)'
                                        }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 
                                                opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            <div className="bg-[#1A1B23] text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                                {formatCurrentTime(new Date())}
                                            </div>
                                            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#1A1B23] 
                                                absolute left-1/2 transform -translate-x-1/2"></div>
                                        </div>
                                        
                                        {showTooltip && (
                                            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-[#1A1B23] text-white px-2 py-1 rounded text-[10px] whitespace-nowrap border border-[#2D3748]">
                                                <div className="flex flex-col gap-0.5">
                                                    {sessionInfo.sessions.map((session, index) => (
                                                        <div key={index} style={{ color: session.hexColor }}>
                                                            {session.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Combined Session Info and Volume Label */}
                    <div className="w-full bg-[#1A1B23] border-t border-[#2D3748] p-3 px-4">
                        {/* Timezone Info */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[12px] text-[#737373] font-medium">
                                Time Zone - {userTimezone.replace('_', ' ')}
                            </div>
                            <div className={`text-[12px] ${volumeColor} flex items-center space-x-1.5 font-medium`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${volumeColor.replace('text-', 'bg-')}`}></div>
                                <span>{currentVolume >= 0.8 ? 'High' : currentVolume >= 0.6 ? 'Medium' : 'Low'} Volume</span>
                            </div>
                        </div>

                        {/* Session Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            {sessions.map(({ name, color, start, end, gradient }) => {
                                const isActive = sessionInfo.sessions.some(s => s.name === name);
                                const localTime = getLocalSessionTime(start, end);
                                
                                return (
                                    <div 
                                        key={name} 
                                        className={`flex flex-col transition-all duration-300 ${
                                            isActive ? 'opacity-100 scale-102' : 'opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className={`w-2 h-2 rounded-full ${
                                                    isActive ? 'animate-pulse' : ''
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className={`text-[13px] text-white ${
                                                isActive ? 'font-medium' : ''
                                            }`}>
                                                {name}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-[#737373] ml-4 mt-0.5">
                                            {localTime}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="h-3"></div> {/* Bottom spacing */}
                </div>
            </div>
        </div>
    );
};

export default ForexSessionsMap;

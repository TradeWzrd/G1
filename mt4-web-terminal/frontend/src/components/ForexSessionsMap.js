import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { geoPath } from 'd3-geo';

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
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeSession, setActiveSession] = useState(null);
    const [mapCenter, setMapCenter] = useState([0, 0]);
    const [mapZoom, setMapZoom] = useState(1.8);
    const [timelinePosition, setTimelinePosition] = useState(0);
    const [lastInteraction, setLastInteraction] = useState(0);
    const [isUserInteracting, setIsUserInteracting] = useState(false);
    const [hoveredSession, setHoveredSession] = useState(null);

    // Get user's timezone offset
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userOffset = new Date().getTimezoneOffset();

    const formatTimeToLocal = (utcTime) => {
        const [hours, minutes] = utcTime.split(':').map(Number);
        const utcDate = new Date();
        utcDate.setUTCHours(hours, minutes || 0);
        
        const localDate = new Date(utcDate.getTime() - userOffset * 60000);
        return localDate.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        }).toLowerCase();
    };

    const formatSessionTime = (timeRange) => {
        const [start, end] = timeRange.split('-');
        return `${formatTimeToLocal(start)} - ${formatTimeToLocal(end)}`;
    };

    const isSessionActive = (timeRange) => {
        const [startStr, endStr] = timeRange.split('-');
        let [startHour] = startStr.split(':').map(Number);
        let [endHour] = endStr.split(':').map(Number);
        
        const now = currentTime.getUTCHours();
        
        if (startHour > endHour) {
            return now >= startHour || now < endHour;
        }
        return now >= startHour && now < endHour;
    };

    const getSessionProgress = (timeRange) => {
        const [startStr, endStr] = timeRange.split('-');
        let [startHour] = startStr.split(':').map(Number);
        let [endHour] = endStr.split(':').map(Number);
        
        const now = currentTime.getUTCHours();
        
        if (startHour > endHour) {
            if (now >= startHour) {
                return (now - startHour) / (24 - startHour + endHour);
            } else {
                return (now + 24 - startHour) / (24 - startHour + endHour);
            }
        }
        return (now - startHour) / (endHour - startHour);
    };

    const getFocusedSession = () => {
        const activeSessions = sessions.filter(session => isSessionActive(session.time));
        
        if (activeSessions.length === 0) return null;
        if (activeSessions.length === 1) return activeSessions[0];

        // Find the session that's just starting or has the least progress
        const sessionsWithProgress = activeSessions.map(session => ({
            ...session,
            progress: getSessionProgress(session.time)
        }));

        // Priority to sessions in their first 15% over sessions in their last 15%
        const startingSessions = sessionsWithProgress.filter(s => s.progress < 0.15);
        if (startingSessions.length > 0) {
            return startingSessions[0];
        }

        // Avoid focusing on sessions that are about to end
        const validSessions = sessionsWithProgress.filter(s => s.progress < 0.85);
        if (validSessions.length > 0) {
            return validSessions[0];
        }

        return sessionsWithProgress[0];
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            
            // Calculate timeline position based on current hour
            const hour = new Date().getUTCHours();
            const minute = new Date().getUTCMinutes();
            const position = ((hour + minute / 60) / 24) * 100;
            setTimelinePosition(position);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Reset map position if user hasn't interacted for 5 seconds
    useEffect(() => {
        if (!isUserInteracting) return;

        const resetTimeout = setTimeout(() => {
            const timeSinceInteraction = Date.now() - lastInteraction;
            if (timeSinceInteraction >= 5000) { // 5 seconds
                setIsUserInteracting(false);
            }
        }, 5000);

        return () => clearTimeout(resetTimeout);
    }, [lastInteraction]);

    // Update focused session only when user is not interacting
    useEffect(() => {
        if (isUserInteracting) return;

        const focusedSession = getFocusedSession();
        if (focusedSession) {
            const [longitude, latitude] = focusedSession.coordinates;
            setMapCenter([longitude, latitude]);
            setMapZoom(3);
        } else {
            setMapCenter([0, 0]);
            setMapZoom(1.8);
        }
    }, [currentTime, isUserInteracting]);

    const handleMapInteraction = () => {
        setIsUserInteracting(true);
        setLastInteraction(Date.now());
    };

    const [showTooltip, setShowTooltip] = useState(false);
    const sessionInfo = sessions.map(session => ({
        name: session.name,
        time: formatSessionTime(session.time),
        color: session.color,
        hexColor: session.hexColor,
        isActive: isSessionActive(session.time)
    }));

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
            <div className="flex-grow relative overflow-hidden">
                <ComposableMap
                    projection="geoEquirectangular"
                    projectionConfig={{
                        scale: 180,
                        rotate: [-10, 0, 0],
                        center: [0, 0]
                    }}
                    className="w-full h-full"
                    style={{
                        clipPath: "polygon(0 0, 100% 0, 100% 85%, 0 85%)",
                        backgroundColor: "#12131A"
                    }}
                >
                    <ZoomableGroup 
                        center={mapCenter}
                        zoom={mapZoom}
                        maxZoom={4}
                        minZoom={1.5}
                        onMoveStart={handleMapInteraction}
                        onMoveEnd={({ coordinates, zoom }) => {
                            setMapCenter(coordinates);
                            setMapZoom(zoom);
                            handleMapInteraction();
                        }}
                    >
                        <defs>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies
                                    .filter(geo => {
                                        return !["Antarctica"].includes(geo.properties.CONTINENT);
                                    })
                                    .map((geo) => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="#1E1F2E"
                                            stroke="#FFFFFF"
                                            strokeOpacity={0.15}
                                            strokeWidth={0.75}
                                            style={{
                                                default: { outline: 'none' },
                                                hover: { 
                                                    fill: '#2D3748',
                                                    transition: 'all 250ms',
                                                },
                                                pressed: { outline: 'none' },
                                            }}
                                        />
                                    ))
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
                                        {/* Hover Area - Invisible larger circle for consistent hover */}
                                        <circle
                                            r={35}
                                            fill="transparent"
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={() => setHoveredSession(name)}
                                            onMouseLeave={() => setHoveredSession(null)}
                                        />

                                        {/* Outer Glow Circle */}
                                        {isActive && (
                                            <motion.circle
                                                r={30}
                                                fill={`${color}15`}
                                                stroke={color}
                                                strokeWidth={0.5}
                                                strokeOpacity={0.3}
                                                filter="url(#glow)"
                                                animate={{
                                                    r: [30, 35, 30],
                                                    opacity: [0.5, 0.3, 0.5]
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        )}
                                        
                                        {/* Main Circle */}
                                        <motion.circle
                                            r={isActive ? 20 : 6}
                                            fill={isActive ? `${color}33` : `${color}11`}
                                            stroke={color}
                                            strokeWidth={isActive ? 2 : 1}
                                            animate={{
                                                r: isActive ? [20, 23, 20] : 6,
                                                strokeWidth: isActive ? [2, 2.5, 2] : 1,
                                                opacity: isActive ? [1, 0.8, 1] : 0.6
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        
                                        {/* Center Dot */}
                                        {isActive && (
                                            <motion.circle
                                                r={2.5}
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
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        )}
                                    </Marker>

                                    {/* Session Label */}
                                    {hoveredSession === name && (
                                        <Marker coordinates={coordinates}>
                                            <foreignObject
                                                x={-60}
                                                y={-45}
                                                width={120}
                                                height={40}
                                                style={{ overflow: 'visible', pointerEvents: 'none' }}
                                            >
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className={`
                                                        relative flex items-center justify-center gap-2
                                                        ${isActive ? 'bg-[#1A1B23]/90 backdrop-blur-md' : 'bg-[#1A1B23]/70'}
                                                        border border-[${color}30]
                                                        text-white rounded-lg shadow-lg
                                                        px-3 py-1.5
                                                    `}
                                                    style={{
                                                        boxShadow: isActive ? `0 0 15px ${color}20` : undefined,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {/* Session Name */}
                                                    <div className="font-semibold text-[12px]" style={{ color }}>
                                                        {name}
                                                    </div>
                                                    
                                                    {/* Active Status */}
                                                    {isActive && (
                                                        <div className="px-1.5 py-0.5 bg-green-500/90 text-[8px] font-semibold rounded-full text-white">
                                                            ACTIVE
                                                        </div>
                                                    )}
                                                </motion.div>
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
                                                    {sessionInfo.map((session, index) => (
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
                    <div className="w-full bg-[#1A1B23] border-t border-[#2D3748]">
                        {/* Header Section */}
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2D3748]">
                            <div className="flex items-center space-x-1.5">
                                <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-500 to-pink-500 rounded-full"></div>
                                <div className="text-[11px] text-white font-medium">
                                    Time Zone - {userTimezone.replace('_', ' ')}
                                </div>
                            </div>
                            <div className={`text-[10px] ${volumeColor} flex items-center space-x-1.5 py-0.5 px-2 rounded-full bg-[#2D3748]/30`}>
                                <div className={`w-1 h-1 rounded-full ${volumeColor.replace('text-', 'bg-')}`}></div>
                                <span className="font-medium">{currentVolume >= 0.8 ? 'High' : currentVolume >= 0.6 ? 'Medium' : 'Low'} Volume</span>
                            </div>
                        </div>

                        {/* Session Grid */}
                        <div className="grid grid-cols-4 gap-0 divide-x divide-[#2D3748]/50">
                            {sessions.map(({ name, color, time, hexColor }) => {
                                const isActive = isSessionActive(time);
                                const localTime = formatSessionTime(time);
                                
                                return (
                                    <div 
                                        key={name} 
                                        className={`flex flex-col p-2 transition-all duration-300 relative ${
                                            isActive ? 'bg-[#2D3748]/10' : ''
                                        }`}
                                    >
                                        {/* Session Name and Status */}
                                        <div className="flex items-center space-x-1.5 mb-1">
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isActive ? 'animate-pulse' : ''
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className={`text-[11px] text-white ${
                                                isActive ? 'font-medium' : ''
                                            }`}>
                                                {name}
                                            </span>
                                        </div>
                                        
                                        {/* Time Display */}
                                        <div className="flex flex-col ml-3">
                                            <span className="text-[10px] text-[#737373]">
                                                {localTime}
                                            </span>
                                            {isActive && (
                                                <span className="text-[9px] text-emerald-400 mt-0.5 font-medium">
                                                    ACTIVE NOW
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Active Indicator */}
                                        {isActive && (
                                            <div 
                                                className="absolute bottom-0 left-0 w-full h-0.5"
                                                style={{ 
                                                    background: `linear-gradient(to right, ${color}00, ${color}66, ${color}00)`,
                                                    boxShadow: `0 0 8px ${color}40`
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="h-2"></div> {/* Bottom spacing */}
                </div>
            </div>
        </div>
    );
};

export default ForexSessionsMap;

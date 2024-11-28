import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

const geoUrl = "https://unpkg.com/world-atlas@2/countries-110m.json";

const sessions = [
    {
        name: 'Sydney',
        coordinates: [151.2093, -33.8688],
        time: '22:00-07:00',
        color: '#10B981',
        gradient: 'from-emerald-500/20 to-emerald-500/5'
    },
    {
        name: 'Tokyo',
        coordinates: [139.6917, 35.6895],
        time: '00:00-09:00',
        color: '#3B82F6',
        gradient: 'from-blue-500/20 to-blue-500/5'
    },
    {
        name: 'London',
        coordinates: [-0.1276, 51.5074],
        time: '08:00-17:00',
        color: '#6366F1',
        gradient: 'from-indigo-500/20 to-indigo-500/5'
    },
    {
        name: 'New York',
        coordinates: [-74.0059, 40.7128],
        time: '13:00-22:00',
        color: '#EC4899',
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

    const formatTime = (date) => {
        const hour = date.getUTCHours();
        const minute = date.getUTCMinutes();
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} UTC`;
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ minHeight: "300px" }}>
            {/* Timeline */}
            <div className="w-full h-8 bg-[#1A1B23] border-b border-[#2D3748] relative flex-shrink-0">
                {/* Hour markers */}
                {Array.from({ length: 24 }, (_, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-[#2D3748] text-[10px] text-[#737373]"
                        style={{ left: `${(i / 24) * 100}%` }}
                    >
                        <span className="absolute -top-4">{i}</span>
                    </div>
                ))}
                
                {/* Session gradients */}
                {sessions.map(({ name, time, gradient }) => {
                    const [start, end] = time.split('-');
                    const startHour = parseInt(start.split(':')[0]);
                    const endHour = parseInt(end.split(':')[0]);
                    const startPercent = (startHour / 24) * 100;
                    const width = endHour > startHour 
                        ? ((endHour - startHour) / 24) * 100
                        : ((24 - startHour + endHour) / 24) * 100;

                    return (
                        <div
                            key={name}
                            className={`absolute h-full bg-gradient-to-r ${gradient}`}
                            style={{
                                left: `${startPercent}%`,
                                width: `${width}%`,
                            }}
                        />
                    );
                })}

                {/* Current time indicator */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-20"
                    style={{ 
                        left: `${timelinePosition}%`,
                        boxShadow: '0 0 10px #8B5CF6'
                    }}
                >
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">
                            {formatTime(currentTime).split(' ')[0]}
                        </div>
                        <div className="text-[10px] text-[#737373] text-center mt-1">
                            UTC
                        </div>
                    </div>
                </div>
            </div>

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

                        {sessions.map(({ name, coordinates, time, color }) => {
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

            {/* Bottom Controls */}
            <div className="w-full bg-[#1A1B23] border-t border-[#2D3748] p-2 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-4">
                    {sessions.map(({ name, color, time }) => (
                        <div key={name} className="flex items-center space-x-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-[#737373]">
                                {name} ({time})
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ForexSessionsMap;

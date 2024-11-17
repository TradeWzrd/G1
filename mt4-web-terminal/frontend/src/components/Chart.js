import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const Chart = ({ data, symbol = 'EURUSD', timeframe = '1H' }) => {
    const chartContainerRef = useRef();
    const chart = useRef();
    const candlestickSeries = useRef();
    const resizeObserver = useRef();

    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        // Initialize chart
        chart.current = createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#FFFFFF',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    width: 1,
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: 0,
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: 0,
                },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.2)',
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 12,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.2)',
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
                visible: true,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
                axisPressedMouseMove: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
        });

        // Add candlestick series
        candlestickSeries.current = chart.current.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
        });

        // Set up resize observer
        resizeObserver.current = new ResizeObserver(entries => {
            if (entries.length === 0 || !chart.current) return;
            const { width, height } = entries[0].contentRect;
            chart.current.applyOptions({ width, height });
            chart.current.timeScale().fitContent();
        });

        resizeObserver.current.observe(container);

        // Update data if available
        if (data && data.length > 0) {
            candlestickSeries.current.setData(data);
            chart.current.timeScale().fitContent();
        }

        // Cleanup
        return () => {
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
            }
            if (chart.current) {
                chart.current.remove();
            }
        };
    }, []);

    // Update data when it changes
    useEffect(() => {
        if (candlestickSeries.current && data && data.length > 0) {
            candlestickSeries.current.setData(data);
            chart.current.timeScale().fitContent();
        }
    }, [data]);

    return (
        <div className="w-full h-full relative bg-black/20 backdrop-blur-md rounded-lg border border-white/10">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
                <span className="text-white font-semibold">{symbol}</span>
                <span className="text-white/60 text-sm">{timeframe}</span>
            </div>
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
};

export default Chart;

import React, { useEffect, useRef, memo } from 'react';
import { colors } from '../styles/colors';

let tvScriptLoadingPromise;

const TradingViewChart = memo(({ 
    symbol = 'EURUSD', 
    interval = '60',
    theme = 'dark',
    orders = [],
    positions = []
}) => {
    const container = useRef();

    useEffect(() => {
        const createWidget = () => {
            if (!container.current) return;

            const widget = document.createElement('div');
            widget.className = 'tradingview-widget-container';
            widget.style.height = '100%';
            widget.style.width = '100%';

            container.current.innerHTML = '';
            container.current.appendChild(widget);

            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
            script.type = 'text/javascript';
            script.async = true;

            const config = {
                "autosize": true,
                "symbol": symbol,
                "interval": interval,
                "timezone": "Etc/UTC",
                "theme": theme,
                "style": "1",
                "locale": "en",
                "enable_publishing": false,
                "backgroundColor": colors.background.primary,
                "gridColor": colors.border.light,
                "allow_symbol_change": true,
                "calendar": false,
                "support_host": "https://www.tradingview.com",
                "hide_volume": false,
                "hide_drawing_toolbar": false,
                "studies": [
                    "RSI@tv-basicstudies",
                    "MASimple@tv-basicstudies"
                ],
                "show_popup_button": false,
                "popup_width": "1000",
                "popup_height": "650",
                "hide_side_toolbar": false,
                "withdateranges": true,
                "save_image": false,
                "details": true,
                "hotlist": true,
                "calendar": true,
                "show_popup_button": false,
                "width": "100%",
                "height": "100%",
                "utm_source": "www.tradingview.com",
                "utm_medium": "widget_new",
                "utm_campaign": "chart",
                "page-uri": window.location.href
            };

            script.innerHTML = JSON.stringify(config);
            widget.appendChild(script);

            return () => {
                if (container.current) {
                    container.current.innerHTML = '';
                }
            };
        };

        createWidget();
    }, [symbol, interval, theme]);

    return (
        <div 
            ref={container}
            className="tradingview-chart-container"
            style={{
                height: '100%',
                width: '100%',
                backgroundColor: colors.background.primary
            }}
        />
    );
});

export default TradingViewChart;

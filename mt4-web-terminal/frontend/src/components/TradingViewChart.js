import React, { useEffect, useRef, memo } from 'react';
import { colors } from '../styles/colors';

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
            widget.className = 'tradingview-chart-container';
            widget.style.height = '100%'; 
            widget.style.width = '100%';
            widget.style.position = 'relative';

            container.current.innerHTML = '';
            container.current.appendChild(widget);

            // Create a wrapper for the TradingView widget
            const widgetWrapper = document.createElement('div');
            widgetWrapper.style.position = 'absolute';
            widgetWrapper.style.top = '0';
            widgetWrapper.style.left = '0';
            widgetWrapper.style.right = '0';
            widgetWrapper.style.bottom = '0';
            widget.appendChild(widgetWrapper);

            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js'; 
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
                "toolbar_bg": colors.background.primary,
                "enable_publishing": false,
                "hide_top_toolbar": false,
                "hide_legend": true,
                "save_image": false,
                "backgroundColor": colors.background.primary,
                "gridColor": colors.border.light,
                "allow_symbol_change": true,
                "container_id": "tradingview_chart",
                "show_popup_button": true,
                "popup_width": "1000",
                "popup_height": "650",
                "withdateranges": true,
                "hide_side_toolbar": false,
                "hideideas": true,
                "disabled_features": [
                    "use_localstorage_for_settings",
                    "header_compare",
                    "header_undo_redo",
                    "header_screenshot",
                    "header_saveload",
                    "show_logo_on_all_charts",
                    "caption_buttons_text_if_possible",
                    "header_settings",
                    "header_fullscreen_button",
                    "border_around_the_chart",
                    "main_series_scale_menu",
                    "legend_context_menu",
                    "symbol_info",
                    "volume_force_overlay",
                    "hide_left_toolbar_by_default",
                    "create_volume_indicator_by_default",
                    "display_market_status",
                    "study_templates",
                    "study_overlay_compare",
                    "study_market_minimized",
                    "study_dialog_search_control",
                    "scales_context_menu",
                    "show_chart_property_page",
                    "chart_crosshair_menu",
                    "chart_events",
                    "marks_context_menu",
                    "show_object_tree",
                    "property_pages",
                    "chart_property_page_trading",
                    "chart_property_page_style",
                    "chart_property_page_scales",
                    "chart_property_page_background",
                    "chart_property_page_timezone_sessions",
                    "chart_property_page_events_alerts"
                ],
                "enabled_features": [
                    "header_widget",
                    "header_symbol_search",
                    "symbol_search_hot_key",
                    "header_chart_type",
                    "timeframes_toolbar",
                    "use_library_ssf",
                    "side_toolbar_in_fullscreen_mode",
                    "disable_resolution_rebuild",
                    "keep_left_toolbar_visible_on_small_screens",
                    "drawing_templates",
                    "left_toolbar"
                ],
                "charts_storage_url": "https://saveload.tradingview.com",
                "client_id": "tradingview.com",
                "charts_storage_api_version": "1.1",
                "toolbar": true,
                "time_frames": [
                    { text: "1m", resolution: "1" },
                    { text: "5m", resolution: "5" },
                    { text: "15m", resolution: "15" },
                    { text: "30m", resolution: "30" },
                    { text: "1h", resolution: "60" },
                    { text: "4h", resolution: "240" },
                    { text: "1D", resolution: "D" },
                    { text: "1W", resolution: "W" },
                    { text: "1M", resolution: "M" }
                ],
                "drawings_access": {
                    "type": "all",
                    "tools": [
                        { "name": "LineToolTrendLine", "grayed": false },
                        { "name": "LineToolHorzLine", "grayed": false },
                        { "name": "LineToolVertLine", "grayed": false },
                        { "name": "LineToolFibRetracement", "grayed": false },
                        { "name": "LineToolRectangle", "grayed": false },
                        { "name": "LineToolCircle", "grayed": false },
                        { "name": "LineToolArrow", "grayed": false },
                        { "name": "LineToolText", "grayed": false },
                        { "name": "LineToolBrush", "grayed": false }
                    ]
                },
                "overrides": {
                    "mainSeriesProperties.style": 1,
                    "mainSeriesProperties.candleStyle.upColor": colors.status.success.base,
                    "mainSeriesProperties.candleStyle.downColor": colors.status.error.base,
                    "mainSeriesProperties.candleStyle.borderUpColor": colors.status.success.base,
                    "mainSeriesProperties.candleStyle.borderDownColor": colors.status.error.base,
                    "mainSeriesProperties.candleStyle.wickUpColor": colors.status.success.base,
                    "mainSeriesProperties.candleStyle.wickDownColor": colors.status.error.base,
                    "paneProperties.background": colors.background.primary,
                    "paneProperties.vertGridProperties.color": colors.border.light,
                    "paneProperties.horzGridProperties.color": colors.border.light,
                    "scalesProperties.textColor": colors.text.primary,
                    "scalesProperties.backgroundColor": colors.background.primary,
                    "scalesProperties.lineColor": colors.border.light,
                    "paneProperties.topMargin": 15,
                    "paneProperties.bottomMargin": 15,
                    "paneProperties.leftAxisProperties.autoScale": true,
                    "paneProperties.leftAxisProperties.visible": true,
                    "paneProperties.rightAxisProperties.visible": true
                },
                "width": "100%",
                "height": "100%"
            };

            script.onload = () => {
                new window.TradingView.widget({
                    ...config,
                    container_id: widgetWrapper.id = 'tv_chart_container'
                });
            };

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
            className="tradingview-chart-container-wrapper"
            style={{
                height: '100%',
                width: '100%',
                backgroundColor: colors.background.primary,
                display: 'flex',
                flexDirection: 'column'
            }}
        />
    );
});

export default TradingViewChart;

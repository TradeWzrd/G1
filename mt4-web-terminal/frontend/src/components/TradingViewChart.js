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
    const widgetRef = useRef(null);

    // Debug log to check positions
    useEffect(() => {
        console.log('Positions:', positions);
        console.log('Orders:', orders);
    }, [positions, orders]);

    useEffect(() => {
        const createWidget = () => {
            if (!container.current) return;

            const widget = document.createElement('div');
            widget.className = 'tradingview-chart-container';
            widget.style.height = '100%';
            widget.style.width = '100%';
            widget.style.position = 'relative';
            widget.id = 'tv_chart_container';

            container.current.innerHTML = '';
            container.current.appendChild(widget);

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
                "container_id": "tv_chart_container",
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
                    "property_pages"
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
                    "left_toolbar",
                    "support_multicharts",
                    "display_market_status"
                ],
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
                "studies_overrides": {
                    "volume.volume.color.0": colors.status.error.base,
                    "volume.volume.color.1": colors.status.success.base,
                },
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
                "width": "100%",
                "height": "100%"
            };

            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;

            script.onload = () => {
                if (window.TradingView) {
                    widgetRef.current = new window.TradingView.widget({
                        ...config,
                        container_id: 'tv_chart_container',
                        onChartReady: () => {
                            console.log('Chart ready, adding markers...');
                            addMarkersToChart();
                        }
                    });
                }
            };

            document.head.appendChild(script);

            return () => {
                if (container.current) {
                    container.current.innerHTML = '';
                }
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                widgetRef.current = null;
            };
        };

        createWidget();
    }, [symbol, interval, theme]);

    const addMarkersToChart = () => {
        if (!widgetRef.current || !widgetRef.current.chart) {
            console.log('Chart not ready yet');
            return;
        }

        const chart = widgetRef.current.chart();
        console.log('Adding markers for positions:', positions.length);

        // Clear existing markers
        chart.removeAllShapes();

        // Add position markers
        positions.forEach((position, index) => {
            try {
                const isLong = position.type === 0;
                const color = isLong ? colors.status.success.base : colors.status.error.base;
                const text = `${isLong ? '🔼' : '🔽'} ${position.lots}`;
                
                console.log('Creating marker for position:', position);

                chart.createShape(
                    {
                        time: position.openTime,
                        price: position.openPrice,
                        text: text,
                        overrides: {
                            shape: isLong ? 'arrow_up' : 'arrow_down',
                            text: text,
                            textColor: color,
                            backgroundColor: color,
                            fontsize: 12,
                            bold: true
                        }
                    },
                    {
                        shape: isLong ? 'arrow_up' : 'arrow_down'
                    }
                );

                // Add SL line if exists
                if (position.sl) {
                    chart.createShape(
                        {
                            time: position.openTime,
                            price: position.sl,
                            text: 'SL',
                            overrides: {
                                linecolor: colors.status.error.base,
                                linestyle: 2,
                                linewidth: 1,
                                showLabel: true,
                                textcolor: colors.status.error.base
                            }
                        },
                        {
                            shape: 'horizontal_line'
                        }
                    );
                }

                // Add TP line if exists
                if (position.tp) {
                    chart.createShape(
                        {
                            time: position.openTime,
                            price: position.tp,
                            text: 'TP',
                            overrides: {
                                linecolor: colors.status.success.base,
                                linestyle: 2,
                                linewidth: 1,
                                showLabel: true,
                                textcolor: colors.status.success.base
                            }
                        },
                        {
                            shape: 'horizontal_line'
                        }
                    );
                }
            } catch (error) {
                console.error('Error creating marker for position:', position, error);
            }
        });
    };

    // Update markers when positions or orders change
    useEffect(() => {
        if (widgetRef.current && widgetRef.current.onChartReady) {
            widgetRef.current.onChartReady(() => {
                addMarkersToChart();
            });
        }
    }, [positions, orders]);

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

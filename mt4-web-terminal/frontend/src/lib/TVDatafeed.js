export default class TVDatafeed {
    constructor(ws) {
        this.ws = ws;
        this.subscribers = {};
        this.lastBar = {};
    }

    onReady(callback) {
        setTimeout(() => callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [
                {
                    value: '',
                    name: 'All Exchanges',
                    desc: ''
                }
            ],
            symbols_types: [
                {
                    name: 'forex',
                    value: 'forex'
                }
            ]
        }));
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        setTimeout(() => {
            onSymbolResolvedCallback({
                name: symbolName,
                full_name: symbolName,
                description: symbolName,
                type: 'forex',
                session: '24x7',
                timezone: 'UTC',
                exchange: '',
                minmov: 1,
                pricescale: 100000,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                data_status: 'streaming',
            });
        }, 0);
    }

    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to, firstDataRequest } = periodParams;
        
        // Request historical data through WebSocket
        this.ws.current?.send(JSON.stringify({
            command: 'GetHistory',
            symbol: symbolInfo.name,
            timeframe: resolution,
            from: from,
            to: to
        }));

        // Set up listener for historical data
        const historyListener = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'history') {
                    const bars = data.bars.map(bar => ({
                        time: bar.time * 1000,
                        open: bar.open,
                        high: bar.high,
                        low: bar.low,
                        close: bar.close,
                        volume: bar.volume
                    }));

                    if (bars.length > 0) {
                        this.lastBar[symbolInfo.name] = bars[bars.length - 1];
                    }

                    onHistoryCallback(bars, { noData: bars.length === 0 });
                }
            } catch (error) {
                console.error('Error processing history data:', error);
                onErrorCallback(error);
            }
        };

        this.ws.current?.addEventListener('message', historyListener);
        
        // Store the listener for cleanup
        if (!this.subscribers[symbolInfo.name]) {
            this.subscribers[symbolInfo.name] = [];
        }
        this.subscribers[symbolInfo.name].push(historyListener);
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        const listener = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'tick' && data.symbol === symbolInfo.name) {
                    const lastBar = this.lastBar[symbolInfo.name];
                    const tick = {
                        time: data.time * 1000,
                        price: data.price
                    };

                    let bar;
                    if (lastBar && tick.time < lastBar.time + this.getResolutionInMs(resolution)) {
                        // Update last bar
                        bar = {
                            ...lastBar,
                            high: Math.max(lastBar.high, tick.price),
                            low: Math.min(lastBar.low, tick.price),
                            close: tick.price,
                            volume: (lastBar.volume || 0) + 1
                        };
                    } else {
                        // Create new bar
                        bar = {
                            time: tick.time,
                            open: tick.price,
                            high: tick.price,
                            low: tick.price,
                            close: tick.price,
                            volume: 1
                        };
                    }

                    this.lastBar[symbolInfo.name] = bar;
                    onRealtimeCallback(bar);
                }
            } catch (error) {
                console.error('Error processing tick data:', error);
            }
        };

        this.ws.current?.addEventListener('message', listener);
        
        // Store the listener for cleanup
        if (!this.subscribers[symbolInfo.name]) {
            this.subscribers[symbolInfo.name] = [];
        }
        this.subscribers[symbolInfo.name].push(listener);
    }

    unsubscribeBars(subscriberUID) {
        Object.keys(this.subscribers).forEach(symbol => {
            this.subscribers[symbol].forEach(listener => {
                this.ws.current?.removeEventListener('message', listener);
            });
            delete this.subscribers[symbol];
        });
    }

    getResolutionInMs(resolution) {
        const resolutionMap = {
            '1': 60000,
            '5': 300000,
            '15': 900000,
            '30': 1800000,
            '60': 3600000,
            '240': 14400000,
            '1D': 86400000,
            '1W': 604800000,
            '1M': 2592000000
        };
        return resolutionMap[resolution] || 60000;
    }
}

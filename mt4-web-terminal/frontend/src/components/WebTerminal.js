import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, TrendingDown, 
  DollarSign, Activity, 
  X, RefreshCw, 
  AlertCircle, Check 
} from 'lucide-react';

const WebTerminal = () => {
  // State management
  const [accountData, setAccountData] = useState({
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    accountNumber: '',
    currency: 'USD',
    leverage: '',
    server: ''
  });
  
  const [positions, setPositions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [eaConnected, setEAConnected] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const wsRef = useRef(null);
  
  const [newOrder, setNewOrder] = useState({
    symbol: 'BTCUSDm',
    lots: 0.01,
    stopLoss: 0,
    takeProfit: 0
  });

  // WebSocket connection handler
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('wss://g1-back.onrender.com');
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setMessage({ type: 'success', text: 'Connected to server' });
      };

      ws.onmessage = (event) => {
        try {
          const data = event.data;
          if (typeof data === 'string' && data.startsWith('ACCOUNT|')) {
            const [, accountStr, , positionsStr] = data.split('|');
            const [balance, equity, margin, freeMargin, accountNumber, currency, leverage, server] = accountStr.split(';');
            
            setAccountData({
              balance: parseFloat(balance),
              equity: parseFloat(equity),
              margin: parseFloat(margin),
              freeMargin: parseFloat(freeMargin),
              accountNumber,
              currency,
              leverage,
              server
            });
            
            setEAConnected(true);

            // Parse positions if they exist
            if (positionsStr) {
              const positionsList = positionsStr.split(';').filter(Boolean).map(pos => {
                const [ticket, symbol, type, lots, openPrice, sl, tp, profit] = pos.split(',');
                return {
                  ticket: parseInt(ticket),
                  symbol,
                  type: parseInt(type),
                  lots: parseFloat(lots),
                  openPrice: parseFloat(openPrice),
                  sl: parseFloat(sl),
                  tp: parseFloat(tp),
                  profit: parseFloat(profit)
                };
              });
              setPositions(positionsList);
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
          setMessage({ type: 'error', text: 'Error processing data' });
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setEAConnected(false);
        setMessage({ type: 'error', text: 'Disconnected from server' });
        setTimeout(connectWebSocket, 5000);
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    };

    connectWebSocket();
  }, []);

  // Trading functions
  const handleTrade = async (type) => {
    try {
      const response = await fetch('https://g1-back.onrender.com/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          symbol: newOrder.symbol,
          type: type === 'buy' ? 0 : 1,
          lots: newOrder.lots,
          stopLoss: newOrder.stopLoss || 0,
          takeProfit: newOrder.takeProfit || 0
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Order executed successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to execute order' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Status Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-bold">Trading Terminal</div>
        <div className="flex gap-2">
          <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 
            ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            <Activity className="w-4 h-4" />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1
            ${eaConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            <RefreshCw className="w-4 h-4" />
            {eaConnected ? 'EA Active' : 'EA Inactive'}
          </div>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { title: 'Balance', value: accountData.balance, icon: <DollarSign /> },
          { title: 'Equity', value: accountData.equity, icon: <Activity /> },
          { title: 'Margin', value: accountData.margin, icon: <TrendingUp /> },
          { title: 'Free Margin', value: accountData.freeMargin, icon: <DollarSign /> }
        ].map((item) => (
          <Card key={item.title} className="bg-gray-800 border-gray-700">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-gray-400 text-sm">{item.title}</div>
                {item.icon}
              </div>
              <div className="text-2xl font-bold mt-2">
                ${item.value.toFixed(2)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-2 gap-4">
        {/* Order Form */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">New Order</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newOrder.symbol}
                onChange={(e) => setNewOrder({ ...newOrder, symbol: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                placeholder="Symbol"
              />
              <input
                type="number"
                value={newOrder.lots}
                onChange={(e) => setNewOrder({ ...newOrder, lots: parseFloat(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                placeholder="Lots"
                step="0.01"
                min="0.01"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={newOrder.stopLoss}
                  onChange={(e) => setNewOrder({ ...newOrder, stopLoss: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Stop Loss"
                />
                <input
                  type="number"
                  value={newOrder.takeProfit}
                  onChange={(e) => setNewOrder({ ...newOrder, takeProfit: parseFloat(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Take Profit"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleTrade('buy')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Buy
                </button>
                <button
                  onClick={() => handleTrade('sell')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-4 h-4" />
                  Sell
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Positions */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Open Positions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Lots</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Profit</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.ticket} className="border-t border-gray-700">
                      <td className="py-2">{position.symbol}</td>
                      <td className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                        {position.type === 0 ? 'Buy' : 'Sell'}
                      </td>
                      <td className="text-right">{position.lots}</td>
                      <td className="text-right">{position.openPrice}</td>
                      <td className={`text-right ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${position.profit.toFixed(2)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleClosePosition(position.ticket)}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default WebTerminal;
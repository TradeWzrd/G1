import React, { useEffect, useState } from 'react';

const WebTerminal = () => {
  const [connected, setConnected] = useState(false);
  const [eaConnected, setEAConnected] = useState(false);
  const [accountData, setAccountData] = useState({
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    accountNumber: 'N/A',
    currency: 'USD',
    leverage: 'N/A',
    server: 'N/A',
  });
  const [positions, setPositions] = useState([]);
  const [newOrder, setNewOrder] = useState({
    symbol: '',
    lots: 0.01,
    stopLoss: 0,
    takeProfit: 0,
  });

  useEffect(() => {
    const ws = new WebSocket('wss://g1-back.onrender.com');
    
    ws.onopen = () => {
      console.log('WebSocket Connected');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = event.data;
        console.log('Received data:', data);
        
        // Parse the custom format message
        if (typeof data === 'string' && data.startsWith('ACCOUNT|')) {
          const [, accountStr, , positionsStr] = data.split('|');
          const [
            balance,
            equity,
            margin,
            freeMargin,
            accountNumber,
            currency,
            leverage,
            server
          ] = accountStr.split(';');

          // Update account data
          setAccountData({
            balance: parseFloat(balance || 0),
            equity: parseFloat(equity || 0),
            margin: parseFloat(margin || 0),
            freeMargin: parseFloat(freeMargin || 0),
            accountNumber: accountNumber || 'N/A',
            currency: currency || 'USD',
            leverage: leverage || 'N/A',
            server: server || 'N/A'
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
                stopLoss: parseFloat(sl),
                takeProfit: parseFloat(tp),
                profit: parseFloat(profit)
              };
            });
            setPositions(positionsList);
          } else {
            setPositions([]);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
      setConnected(false);
      setEAConnected(false);
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    return () => ws.close();
  }, []);

  const handleTrade = (type) => {
    // Implement trade logic here
  };

  const handleCloseAll = () => {
    // Implement close all positions logic here
  };

  const handleClosePosition = (ticket) => {
    // Implement close position logic here
  };

  return (
    <div className="p-4 space-y-4">
      {/* Status Bar */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Trading Terminal</h1>
        <div className="flex gap-2">
          <div className={`px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${eaConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {eaConnected ? 'EA Active' : 'EA Inactive'}
          </div>
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: 'Balance', value: accountData.balance },
          { title: 'Equity', value: accountData.equity },
          { title: 'Margin', value: accountData.margin },
          { title: 'Free Margin', value: accountData.freeMargin }
        ].map(item => (
          <div key={item.title} className="bg-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400">{item.title}</div>
            <div className="text-xl font-bold mt-1">
              ${item.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Order Form */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">New Order</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={newOrder.symbol}
              onChange={(e) => setNewOrder({ ...newOrder, symbol: e.target.value })}
              className="w-full bg-gray-700 rounded p-2"
              placeholder="Symbol"
            />
            <input
              type="number"
              value={newOrder.lots}
              onChange={(e) => setNewOrder({ ...newOrder, lots: parseFloat(e.target.value) })}
              className="w-full bg-gray-700 rounded p-2"
              step="0.01"
              min="0.01"
              placeholder="Lots"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={newOrder.stopLoss}
                onChange={(e) => setNewOrder({ ...newOrder, stopLoss: parseFloat(e.target.value) })}
                className="w-full bg-gray-700 rounded p-2"
                placeholder="Stop Loss"
              />
              <input
                type="number"
                value={newOrder.takeProfit}
                onChange={(e) => setNewOrder({ ...newOrder, takeProfit: parseFloat(e.target.value) })}
                className="w-full bg-gray-700 rounded p-2"
                placeholder="Take Profit"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTrade('buy')}
                className="bg-green-600 hover:bg-green-700 text-white py-2 rounded"
              >
                Buy
              </button>
              <button
                onClick={() => handleTrade('sell')}
                className="bg-red-600 hover:bg-red-700 text-white py-2 rounded"
              >
                Sell
              </button>
            </div>
          </div>
        </div>

        {/* Positions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Open Positions</h2>
            {positions.length > 0 && (
              <button
                onClick={handleCloseAll}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Close All
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-400">
                  <th className="text-left">Symbol</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Lots</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Profit</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(position => (
                  <tr key={position.ticket} className="border-t border-gray-700">
                    <td>{position.symbol}</td>
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
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebTerminal;
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WebTerminal from './components/WebTerminal';

const App = () => {
    const [accountData, setAccountData] = useState(null);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket('wss://g1-back.onrender.com');
        
        ws.onopen = () => {
            console.log('WebSocket Connected');
            setConnected(true);
        };
        
        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setConnected(false);
            setEAConnected(false);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received data:', data);
                
                if (data.type === 'update' || data.type === 'status') {
                    setEAConnected(data.connected);
                    setAccountData(data.data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard accountData={accountData} />} />
                    <Route path="/trading" element={<WebTerminal accountData={accountData} />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
};

export default App;
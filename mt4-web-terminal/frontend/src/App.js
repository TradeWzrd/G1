import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WebTerminal from './components/WebTerminal';

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/trading" element={<WebTerminal />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

export default App;
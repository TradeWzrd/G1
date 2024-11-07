const config = {
    BACKEND_HTTP_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    BACKEND_WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3000'
};

export default config;
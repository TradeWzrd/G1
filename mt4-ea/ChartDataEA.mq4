#property copyright "Chart Data Streaming EA"
#property version   "1.00"
#property strict

// External parameters
extern string   ServerURL = "https://g1-back.onrender.com";  // Server URL
extern string   ApiKey = "";                                 // API Key for authentication
extern string   Symbols = "EURUSD,GBPUSD,USDJPY";           // Comma-separated symbols to monitor
extern int      UpdateInterval = 1;                          // Update interval in seconds

// Connection state
bool isConnected = false;
datetime lastUpdateTime = 0;

// Timeframe mapping
int Timeframes[] = {PERIOD_M1, PERIOD_M5, PERIOD_M15, PERIOD_H1, PERIOD_H4, PERIOD_D1};
string TimeframeNames[] = {"1m", "5m", "15m", "1h", "4h", "1d"};

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    // Enable WebRequest
    if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
    {
        Alert("Please allow web requests in MT4 settings!");
        return INIT_FAILED;
    }
    
    EventSetMillisecondTimer(UpdateInterval * 1000);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer()
{
    // Stream real-time data for all symbols
    string symbols[];
    StringSplit(Symbols, ',', symbols);
    
    // Create data string in server's expected format
    string data = "MARKET|";
    
    // Add market data for each symbol
    bool firstSymbol = true;
    for(int i = 0; i < ArraySize(symbols); i++)
    {
        string symbol = symbols[i];
        if(!firstSymbol) data += ";";
        
        MqlTick lastTick;
        SymbolInfoTick(symbol, lastTick);
        
        // Format: symbol,bid,ask,time
        data += StringFormat("%s,%f,%f,%d",
            symbol,
            lastTick.bid,
            lastTick.ask,
            TimeLocal()
        );
        
        firstSymbol = false;
    }
    
    // Add candle data
    data += "|CANDLES|";
    bool firstCandle = true;
    
    for(int i = 0; i < ArraySize(symbols); i++)
    {
        string symbol = symbols[i];
        for(int j = 0; j < ArraySize(Timeframes); j++)
        {
            int timeframe = Timeframes[j];
            string timeframeName = TimeframeNames[j];
            
            MqlRates rates[];
            ArraySetAsSeries(rates, true);
            
            int copied = CopyRates(symbol, timeframe, 0, 1, rates);
            if(copied > 0)
            {
                if(!firstCandle) data += ";";
                
                // Format: symbol,timeframe,time,open,high,low,close,volume
                data += StringFormat("%s,%s,%d,%f,%f,%f,%f,%d",
                    symbol,
                    timeframeName,
                    rates[0].time,
                    rates[0].open,
                    rates[0].high,
                    rates[0].low,
                    rates[0].close,
                    rates[0].tick_volume
                );
                
                firstCandle = false;
            }
        }
    }
    
    SendToServer(data);
}

//+------------------------------------------------------------------+
//| Send data to server                                               |
//+------------------------------------------------------------------+
void SendToServer(string data)
{
    string headers;
    char post[];
    char result[];
    string result_headers;
    
    headers = "Content-Type: text/plain\r\n";
    if(StringLen(ApiKey) > 0)
        headers += "X-API-Key: " + ApiKey + "\r\n";
    
    StringToCharArray(data, post);
    
    int res = WebRequest(
        "POST",                     // Method
        ServerURL + "/api/mt4/data", // URL
        headers,                    // Headers
        5000,                      // Timeout
        post,                      // Data
        result,                    // Result
        result_headers             // Response headers
    );
    
    if(res == -1)
    {
        int error = GetLastError();
        Print("Error in WebRequest. Error code: ", error);
        if(error == 4014)
            MessageBox("Please allow WebRequest for " + ServerURL + "\r\nAdd the address in Expert Advisors tab in Tools > Options > Expert Advisors", "Error", MB_ICONERROR);
    }
    else
    {
        isConnected = true;
        lastUpdateTime = TimeLocal();
        
        // Process any commands from the server
        string response = CharArrayToString(result);
        if(StringLen(response) > 0)
        {
            ProcessServerResponse(response);
        }
    }
}

//+------------------------------------------------------------------+
//| Process server response                                           |
//+------------------------------------------------------------------+
void ProcessServerResponse(string response)
{
    // Extract commands from response
    string commands = ExtractJsonValue(response, "commands");
    if(StringLen(commands) > 0)
    {
        string commandArray[];
        int numCommands = StringSplit(commands, ';', commandArray);
        
        for(int i = 0; i < numCommands; i++)
        {
            string command = commandArray[i];
            if(StringFind(command, "GET_HISTORY") == 0)
            {
                // Format: GET_HISTORY|symbol|timeframe|from|to|requestId
                string parts[];
                StringSplit(command, '|', parts);
                
                if(ArraySize(parts) >= 6)
                {
                    string symbol = parts[1];
                    string timeframe = parts[2];
                    datetime fromTime = StringToTime(parts[3]);
                    datetime toTime = StringToTime(parts[4]);
                    string requestId = parts[5];
                    
                    SendHistoricalData(symbol, timeframe, fromTime, toTime, requestId);
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Send historical candle data                                       |
//+------------------------------------------------------------------+
void SendHistoricalData(string symbol, string timeframe, datetime fromTime, datetime toTime, string requestId)
{
    // Find matching timeframe
    int timeframeValue = PERIOD_M1;
    for(int i = 0; i < ArraySize(TimeframeNames); i++)
    {
        if(TimeframeNames[i] == timeframe)
        {
            timeframeValue = Timeframes[i];
            break;
        }
    }
    
    // Get historical data
    MqlRates rates[];
    ArraySetAsSeries(rates, true);
    
    int barsCount = (toTime - fromTime) / (timeframeValue * 60);
    int copied = CopyRates(symbol, timeframeValue, fromTime, barsCount, rates);
    
    if(copied > 0)
    {
        string data = "HISTORY|REQUEST_ID|" + requestId + "|";
        
        for(int i = 0; i < copied; i++)
        {
            if(i > 0) data += ";";
            
            // Format: time,open,high,low,close,volume
            data += StringFormat("%d,%f,%f,%f,%f,%d",
                rates[i].time,
                rates[i].open,
                rates[i].high,
                rates[i].low,
                rates[i].close,
                rates[i].tick_volume
            );
        }
        
        SendToServer(data);
    }
}

//+------------------------------------------------------------------+
//| Extract value from JSON string                                    |
//+------------------------------------------------------------------+
string ExtractJsonValue(string json, string key)
{
    string value = "";
    int keyPos = StringFind(json, "\"" + key + "\"");
    if(keyPos != -1)
    {
        int colonPos = StringFind(json, ":", keyPos);
        if(colonPos != -1)
        {
            int valueStart = colonPos + 1;
            while(StringGetCharacter(StringSubstr(json, valueStart, 1), 0) == ' ')
            {
                valueStart++;
            }
            
            if(StringGetCharacter(StringSubstr(json, valueStart, 1), 0) == '\"')
            {
                valueStart++;
                int valueEnd = StringFind(json, "\"", valueStart);
                if(valueEnd != -1)
                {
                    value = StringSubstr(json, valueStart, valueEnd - valueStart);
                }
            }
            else
            {
                int valueEnd = StringFind(json, ",", valueStart);
                if(valueEnd == -1) valueEnd = StringFind(json, "}", valueStart);
                if(valueEnd != -1)
                {
                    value = StringSubstr(json, valueStart, valueEnd - valueStart);
                }
            }
        }
    }
    return value;
}

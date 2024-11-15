#property copyright "Copyright 2024"
#property link      ""
#property version   "1.00"
#property strict

// External parameters
extern string   ServerURL = "https://g1-back.onrender.com";  // Server URL
extern string   ApiKey = "";                                 // API Key
extern int      UpdateInterval = 3;                         // Update interval in seconds

// Magic number for identifying our trades
#define MAGICMA 20240101

// Global variables
bool isConnected = false;
string lastError = "";
string wsUrl;  // WebSocket URL

//+------------------------------------------------------------------+
//| Create simple data string                                         |
//+------------------------------------------------------------------+
string CreateUpdateString()
{
    // Format: ACCOUNT|balance;equity;margin;freeMargin|POSITIONS|ticket,symbol,type,lots,openPrice,sl,tp,profit
    string data = "ACCOUNT|";
    
    // Account data
    data += DoubleToStr(AccountBalance(), 2) + ";";
    data += DoubleToStr(AccountEquity(), 2) + ";";
    data += DoubleToStr(AccountMargin(), 2) + ";";
    data += DoubleToStr(AccountFreeMargin(), 2);
    
    // Add positions
    data += "|POSITIONS|";
    bool firstPosition = true;
    
    for(int i = 0; i < OrdersTotal(); i++) {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
            if(!firstPosition) data += ";";
            
            data += OrderTicket() + ",";
            data += OrderSymbol() + ",";
            data += OrderType() + ",";
            data += DoubleToStr(OrderLots(), 2) + ",";
            data += DoubleToStr(OrderOpenPrice(), 5) + ",";
            data += DoubleToStr(OrderStopLoss(), 5) + ",";
            data += DoubleToStr(OrderTakeProfit(), 5) + ",";
            data += DoubleToStr(OrderProfit(), 2);
            
            firstPosition = false;
        }
    }
    
    return data;
}

//+------------------------------------------------------------------+
//| Process server response                                           |
//+------------------------------------------------------------------+
void ProcessServerResponse(string response)
{
    Print("Processing server response: ", response);
    
    // Check if response contains commands
    if (StringFind(response, "commands") != -1) {
        string commandsStr = ExtractValueFromJson(response, "commands");
        if (StringLen(commandsStr) > 0) {
            ProcessCommand(commandsStr);
        }
    }
}

//+------------------------------------------------------------------+
//| Process JSON command                                               |
//+------------------------------------------------------------------+
string ExtractValueFromJson(string json, string key)
{
    string value = "";
    int keyPos = StringFind(json, "\"" + key + "\"");
    if (keyPos != -1) {
        int colonPos = StringFind(json, ":", keyPos);
        if (colonPos != -1) {
            // Handle array values
            if (StringGetCharacter(StringSubstr(json, colonPos + 1, 1), 0) == '[') {
                int arrayStart = StringFind(json, "[", colonPos);
                int arrayEnd = StringFind(json, "]", arrayStart);
                if (arrayStart != -1 && arrayEnd != -1) {
                    value = StringSubstr(json, arrayStart, arrayEnd - arrayStart + 1);
                }
            }
            // Handle string values
            else {
                int valueStart = StringFind(json, "\"", colonPos) + 1;
                int valueEnd = StringFind(json, "\"", valueStart);
                if (valueStart != 0 && valueEnd != -1) {
                    value = StringSubstr(json, valueStart, valueEnd - valueStart);
                }
            }
        }
    }
    return value;
}

//+------------------------------------------------------------------+
//| Process single command                                            |
//+------------------------------------------------------------------+
void ProcessCommand(string rawCommand)
{
    // Skip if empty command
    if (StringLen(rawCommand) == 0) return;
    
    // Remove array brackets and quotes if present
    if (StringGetChar(rawCommand, 0) == '[') rawCommand = StringSubstr(rawCommand, 1);
    if (StringGetChar(rawCommand, StringLen(rawCommand)-1) == ']') rawCommand = StringSubstr(rawCommand, 0, StringLen(rawCommand)-1);
    if (StringGetChar(rawCommand, 0) == '"') rawCommand = StringSubstr(rawCommand, 1);
    if (StringGetChar(rawCommand, StringLen(rawCommand)-1) == '"') rawCommand = StringSubstr(rawCommand, 0, StringLen(rawCommand)-1);
    
    // Split command into parts
    string parts[];
    StringSplit(rawCommand, ',', parts);
    
    if (ArraySize(parts) < 2) return;
    
    string action = parts[0];
    string symbol = parts[1];
    
    // Handle history requests
    if (action == "GET_HISTORY") {
        SendHistoryData(symbol);
        return;
    }
    
    // Handle trade commands
    double qty = 0.1;  // default lot size
    double price = 0;
    double sl = 0;
    double tp = 0;
    string comment = "Web Terminal";
    
    // Process parameters
    for (int i = 2; i < ArraySize(parts); i++) {
        string param = parts[i];
        string key_value[];
        StringSplit(param, '=', key_value);
        
        if (ArraySize(key_value) != 2) continue;
        
        string key = key_value[0];
        string value = key_value[1];
        
        // Remove quotes if present
        if (StringGetChar(value, 0) == '"') value = StringSubstr(value, 1);
        if (StringGetChar(value, StringLen(value)-1) == '"') value = StringSubstr(value, 0, StringLen(value)-1);
        
        if (key == "risk") qty = StringToDouble(value);
        else if (key == "price") price = StringToDouble(value);
        else if (key == "sl") sl = StringToDouble(value);
        else if (key == "tp") tp = StringToDouble(value);
        else if (key == "comment") comment = value;
    }
    
    // Execute trade based on action
    if (action == "buy") {
        OrderSend(symbol, OP_BUY, qty, Ask, 3, sl, tp, comment, MAGICMA, 0, clrGreen);
    }
    else if (action == "sell") {
        OrderSend(symbol, OP_SELL, qty, Bid, 3, sl, tp, comment, MAGICMA, 0, clrRed);
    }
    else if (action == "closelong" || action == "closeshort") {
        CloseAllPositions(symbol, action == "closelong" ? OP_BUY : OP_SELL);
    }
    else if (action == "closeall") {
        CloseAllPositions(symbol, -1);
    }
}

//+------------------------------------------------------------------+
//| Get trade history for specified period                            |
//+------------------------------------------------------------------+
string GetTradeHistory(string period, string startDate="", string endDate="")
{
    datetime startTime = 0;
    datetime endTime = TimeCurrent();
    
    Print("Getting trade history - Period:", period);
    
    if(period == "today") {
        startTime = StrToTime(TimeToStr(TimeCurrent(), TIME_DATE));
        Print("Today's history - Start time:", TimeToStr(startTime));
    }
    else if(period == "last3days") {
        startTime = TimeCurrent() - 3 * 24 * 60 * 60;
        Print("Last 3 days history - Start time:", TimeToStr(startTime));
    }
    else if(period == "lastweek") {
        startTime = TimeCurrent() - 7 * 24 * 60 * 60;
        Print("Last week history - Start time:", TimeToStr(startTime));
    }
    else if(period == "lastmonth") {
        startTime = TimeCurrent() - 30 * 24 * 60 * 60;
        Print("Last month history - Start time:", TimeToStr(startTime));
    }
    else if(period == "last3months") {
        startTime = TimeCurrent() - 90 * 24 * 60 * 60;
        Print("Last 3 months history - Start time:", TimeToStr(startTime));
    }
    else if(period == "last6months") {
        startTime = TimeCurrent() - 180 * 24 * 60 * 60;
        Print("Last 6 months history - Start time:", TimeToStr(startTime));
    }
    else if(period == "custom" && startDate != "" && endDate != "") {
        startTime = StrToTime(startDate);
        endTime = StrToTime(endDate) + 24 * 60 * 60 - 1; // End of the day
        Print("Custom period history - Start:", TimeToStr(startTime), " End:", TimeToStr(endDate));
    }
    
    string history = "";
    bool firstTrade = true;
    int tradesFound = 0;
    
    Print("Searching for trades between ", TimeToStr(startTime), " and ", TimeToStr(endTime));
    
    for(int i = OrdersHistoryTotal() - 1; i >= 0; i--) {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) {
            Print("Error selecting order ", i, " - Error:", GetLastError());
            continue;
        }
        
        datetime closeTime = OrderCloseTime();
        if(closeTime >= startTime && closeTime <= endTime) {
            if(!firstTrade) history += ";";
            
            // Format: ticket,symbol,type,lots,openPrice,closePrice,openTime,closeTime,profit,commission,swap
            history += OrderTicket() + ",";
            history += OrderSymbol() + ",";
            history += OrderType() + ",";
            history += DoubleToStr(OrderLots(), 2) + ",";
            history += DoubleToStr(OrderOpenPrice(), 5) + ",";
            history += DoubleToStr(OrderClosePrice(), 5) + ",";
            history += TimeToStr(OrderOpenTime(), TIME_DATE|TIME_SECONDS) + ",";
            history += TimeToStr(OrderCloseTime(), TIME_DATE|TIME_SECONDS) + ",";
            history += DoubleToStr(OrderProfit(), 2) + ",";
            history += DoubleToStr(OrderCommission(), 2) + ",";
            history += DoubleToStr(OrderSwap(), 2);
            
            firstTrade = false;
            tradesFound++;
            Print("Added trade #", OrderTicket(), " to history");
        }
    }
    
    Print("Found ", tradesFound, " trades in the specified period");
    if(tradesFound == 0) {
        Print("No trades found in the period");
    } else {
        Print("History string length: ", StringLen(history));
    }
    
    return history;
}

//+------------------------------------------------------------------+
//| Send update to server                                             |
//+------------------------------------------------------------------+
void SendUpdate()
{
    string data = CreateUpdateString();
    Print("Sending data: ", data);
    
    string headers = "Content-Type: text/plain\r\n";
    if(StringLen(ApiKey) > 0) {
        headers += "X-API-Key: " + ApiKey + "\r\n";
    }
    
    char post[];
    StringToCharArray(data, post);
    
    char result[];
    string resultHeaders;
    
    int res = WebRequest(
        "POST",
        ServerURL + "/api/mt4/update",
        headers,
        5000,
        post,
        result,
        resultHeaders
    );
    
    if(res == -1) {
        lastError = "Update failed: " + GetLastError();
        isConnected = false;
    } else {
        string response = CharArrayToString(result);
        Print("Server response: ", response);
        ProcessServerResponse(response);
        isConnected = true;
        lastError = "";
    }
}

//+------------------------------------------------------------------+
//| Send data to server                                               |
//+------------------------------------------------------------------+
void SendToServer(string data)
{
    Print("Sending data: ", data);
    
    string headers = "Content-Type: text/plain\r\n";
    if(StringLen(ApiKey) > 0) {
        headers += "X-API-Key: " + ApiKey + "\r\n";
    }
    
    char post[];
    StringToCharArray(data, post);
    
    char result[];
    string resultHeaders;
    
    int res = WebRequest(
        "POST",
        ServerURL + "/api/mt4/update",
        headers,
        5000,
        post,
        result,
        resultHeaders
    );
    
    if(res == -1) {
        lastError = "Update failed: " + GetLastError();
        isConnected = false;
    } else {
        string response = CharArrayToString(result);
        Print("Server response: ", response);
        ProcessServerResponse(response);
        isConnected = true;
        lastError = "";
    }
}

//+------------------------------------------------------------------+
//| Send history data to the client                                    |
//+------------------------------------------------------------------+
void SendHistoryData(string symbol) {
    string historyData = GetTradeHistory("ALL");
    SendToServer(StringConcatenate("HISTORY|", historyData));
}

//+------------------------------------------------------------------+
//| Close all positions for a given symbol and type                    |
//+------------------------------------------------------------------+
void CloseAllPositions(string symbol, int type = -1) {
    for (int i = OrdersTotal() - 1; i >= 0; i--) {
        if (!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
        
        // Skip if not our symbol
        if (symbol != "" && OrderSymbol() != symbol) continue;
        
        // Skip if not our type (-1 means close all types)
        if (type != -1 && OrderType() != type) continue;
        
        // Skip if not our EA's order
        if (OrderMagicNumber() != MAGICMA) continue;
        
        bool result = false;
        
        RefreshRates();
        
        switch (OrderType()) {
            case OP_BUY:
                result = OrderClose(OrderTicket(), OrderLots(), MarketInfo(OrderSymbol(), MODE_BID), 3, clrRed);
                break;
            case OP_SELL:
                result = OrderClose(OrderTicket(), OrderLots(), MarketInfo(OrderSymbol(), MODE_ASK), 3, clrRed);
                break;
        }
        
        if (!result) {
            Print("Failed to close order #", OrderTicket(), ": ", GetLastError());
        }
    }
}

//+------------------------------------------------------------------+
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer() {
    static datetime lastUpdate = 0;
    datetime currentTime = TimeCurrent();
    
    // Only send update if enough time has passed
    if (currentTime - lastUpdate >= UpdateInterval) {
        SendUpdate();
        lastUpdate = currentTime;
    }
}

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit() {
    // Convert HTTP URL to WebSocket URL
    wsUrl = StringReplace(ServerURL, "https://", "wss://");
    wsUrl = StringReplace(wsUrl, "http://", "ws://");
    wsUrl = wsUrl + "/mt4";  // Add /mt4 path to identify as MT4 client
    
    Print("Connecting to WebSocket server: ", wsUrl);
    
    // Set up timer for regular updates
    EventSetMillisecondTimer(UpdateInterval * 1000);
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    string status = "Trading Terminal EA\n";
    status += "Server: " + ServerURL + "\n";
    status += "Connected: " + (isConnected ? "Yes" : "No") + "\n";
    if(lastError != "") status += "Error: " + lastError + "\n";
    Comment(status);
}

//+------------------------------------------------------------------+
//| Chart event function                                              |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long& lparam, const double& dparam, const string& sparam)
{
    if(id == CHARTEVENT_CUSTOM+1) {
        // Handle incoming WebSocket commands
        if(StringFind(sparam, "COMMAND|") == 0) {
            string command = StringSubstr(sparam, 8);
            
            if(StringFind(command, "GET_HISTORY|") == 0) {
                string params = StringSubstr(command, 11);
                string period = "";
                datetime startDate = 0;
                datetime endDate = 0;
                
                // Parse period and dates from params
                string parts[];
                int split = StringSplit(params, '|', parts);
                if(split >= 1) period = parts[0];
                if(split >= 3) {
                    startDate = StringToTime(parts[1]);
                    endDate = StringToTime(parts[2]);
                }
                
                string historyData = GetTradeHistory(period, TimeToStr(startDate), TimeToStr(endDate));
                
                // Send history data using WebRequest
                string headers = "Content-Type: application/json\r\n";
                if(StringLen(ApiKey) > 0) {
                    headers += "X-API-Key: " + ApiKey + "\r\n";
                }
                
                char post[];
                StringToCharArray(historyData, post);
                
                char result[];
                string resultHeaders;
                
                int res = WebRequest(
                    "POST",
                    ServerURL + "/api/trade-history/ea",
                    headers,
                    5000,
                    post,
                    result,
                    resultHeaders
                );
                
                if(res == -1) {
                    Print("Error sending history data: ", GetLastError());
                } else {
                    Print("History data sent successfully");
                }
                
                return;
            }
        }
    }
}

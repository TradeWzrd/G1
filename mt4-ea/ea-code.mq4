#property copyright "Simple Trading Terminal EA"
#property version   "3.00"
#property strict

extern string   ServerURL = "https://g1-back.onrender.com";  // Server URL
extern string   ApiKey = "";                                 // API Key
extern int      UpdateInterval = 3;                         // Update interval in seconds

// Global variables
bool isConnected = false;
string lastError = "";

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
    Print("Processing command: ", rawCommand);
    
    // Skip if empty command
    if (StringLen(rawCommand) == 0) return;
    
    // Remove array brackets and quotes if present
    if (StringGetChar(rawCommand, 0) == '[') rawCommand = StringSubstr(rawCommand, 1);
    if (StringGetChar(rawCommand, StringLen(rawCommand)-1) == ']') rawCommand = StringSubstr(rawCommand, 0, StringLen(rawCommand)-1);
    if (StringGetChar(rawCommand, 0) == '"') rawCommand = StringSubstr(rawCommand, 1);
    if (StringGetChar(rawCommand, StringLen(rawCommand)-1) == '"') rawCommand = StringSubstr(rawCommand, 0, StringLen(rawCommand)-1);
    
    // Handle history requests
    if (StringFind(rawCommand, "GET_HISTORY") == 0) {
        string parts[];
        StringSplit(rawCommand, '|', parts);
        
        string period = ArraySize(parts) > 1 ? parts[1] : "ALL";
        string historyData = GetTradeHistory(period);
        SendToServer(StringConcatenate("HISTORY|", historyData));
        return;
    }
    
    // Process trading commands
    if (StringFind(rawCommand, "/ORDER") != 0) {
        Print("Invalid command format, must start with /ORDER");
        return;
    }
    
    // Split command into parts
    string parts[];
    StringSplit(rawCommand, ' ', parts);
    if (ArraySize(parts) < 3) {
        Print("Invalid command format: not enough parts");
        return;
    }
    
    string symbol = parts[1];
    string action = parts[2];
    
    // Parse parameters
    string type = "";
    double qty = 0;
    double price = 0;
    double sl = 0;
    double tp = 0;
    int ticket = 0;
    
    for (int i = 3; i < ArraySize(parts); i++) {
        string param = parts[i];
        string key_value[];
        StringSplit(param, '=', key_value);
        
        if (ArraySize(key_value) != 2) continue;
        
        string key = key_value[0];
        string value = key_value[1];
        
        // Remove quotes if present
        if (StringGetChar(value, 0) == '"') value = StringSubstr(value, 1);
        if (StringGetChar(value, StringLen(value)-1) == '"') value = StringSubstr(value, 0, StringLen(value)-1);
        
        if (key == "type") type = value;
        else if (key == "qty") qty = StringToDouble(value);
        else if (key == "price") price = StringToDouble(value);
        else if (key == "sl") sl = StringToDouble(value);
        else if (key == "tp") tp = StringToDouble(value);
        else if (key == "id") ticket = (int)StringToInteger(value);
    }
    
    // Execute commands
    if (action == "MARKET") {
        int orderType = type == "buy" ? OP_BUY : OP_SELL;
        RefreshRates();
        price = orderType == OP_BUY ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);
        
        Print("Executing market order: ", symbol, " ", orderType, " ", qty, " @ ", price, " sl:", sl, " tp:", tp);
        
        if (qty <= 0) {
            Print("Invalid lot size: ", qty);
            return;
        }
        
        int ticket = OrderSend(
            symbol,          // Symbol
            orderType,       // Operation
            qty,            // Lots
            price,          // Price
            3,              // Slippage
            sl,             // Stop Loss
            tp,             // Take Profit
            "Web Terminal", // Comment
            0,             // Magic Number
            0,             // Expiration
            orderType == OP_BUY ? clrBlue : clrRed
        );
        
        if (ticket < 0) {
            int error = GetLastError();
            Print("Order failed - Error: ", error);
        } else {
            Print("Order executed successfully. Ticket: ", ticket);
        }
    }
    else if (action == "CLOSE") {
        if (ticket <= 0) {
            Print("Invalid ticket number");
            return;
        }
        
        if (!OrderSelect(ticket, SELECT_BY_TICKET)) {
            Print("Order not found: ", ticket);
            return;
        }
        
        bool success = OrderClose(OrderTicket(), OrderLots(), OrderClosePrice(), 3, clrWhite);
        if (!success) {
            Print("Failed to close order: ", GetLastError());
        }
    }
    else if (action == "MODIFY") {
        if (ticket <= 0) {
            Print("Invalid ticket number");
            return;
        }
        
        if (!OrderSelect(ticket, SELECT_BY_TICKET)) {
            Print("Order not found: ", ticket);
            return;
        }
        
        bool success = OrderModify(ticket, OrderOpenPrice(), sl, tp, 0, clrYellow);
        if (!success) {
            Print("Failed to modify order: ", GetLastError());
        }
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
//| Timer function                                                    |
//+------------------------------------------------------------------+
void OnTimer()
{
    SendUpdate();
}

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    EventSetTimer(UpdateInterval);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
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

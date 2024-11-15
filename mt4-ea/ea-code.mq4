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
    
    // Extract commands array
    string commands = GetJsonValue(response, "commands");
    if(StringLen(commands) == 0) return;
    
    // Remove brackets [ ]
    if(StringGetChar(commands, 0) == '[')
        commands = StringSubstr(commands, 1, StringLen(commands) - 2);
    
    Print("Commands to process: ", commands);
    
    // Process each command
    string cmdArray[];
    int numCmds = StringSplit(commands, '"', cmdArray);
    
    for(int i = 0; i < numCmds; i++) {
        string cmd = cmdArray[i];
        // Skip empty or separator elements
        if(StringLen(cmd) > 0 && cmd != "," && cmd != "[" && cmd != "]") {
            ProcessCommand(cmd);
        }
    }
}

//+------------------------------------------------------------------+
//| Process single command                                            |
//+------------------------------------------------------------------+
void ProcessCommand(string cmd)
{
    Print("Processing single command: ", cmd);

    // Split command into parts, handling both comma and pipe delimiters
    string parts[];
    if(StringFind(cmd, "|") != -1) {
        StringSplit(cmd, '|', parts);
    } else {
        StringSplit(cmd, ',', parts);
    }
    
    if(ArraySize(parts) < 1) return;
    
    string action = parts[0];
    Print("Action to execute: ", action);
    
    if(action == "BUY" || action == "SELL") {
        if(ArraySize(parts) < 5) {
            Print("Invalid buy/sell command format");
            return;
        }
        
        string symbol = parts[1];
        double lots = StringToDouble(parts[2]);
        double sl = StringToDouble(parts[3]);
        double tp = StringToDouble(parts[4]);
        
        int type = (action == "BUY") ? OP_BUY : OP_SELL;
        
        RefreshRates();
        double price = (type == OP_BUY) ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);
        
        Print("Executing order: ", symbol, " ", type, " ", lots, " @ ", price, " sl:", sl, " tp:", tp);
        
        // Add some validation
        if(lots <= 0) {
            Print("Invalid lot size: ", lots);
            return;
        }
        
        if(price <= 0) {
            Print("Invalid price: ", price);
            return;
        }
        
        int ticket = OrderSend(
            symbol,          // Symbol
            type,           // Operation
            lots,           // Lots
            price,          // Price
            3,             // Slippage
            sl,            // Stop Loss
            tp,            // Take Profit
            "Web Terminal", // Comment
            0,             // Magic Number
            0,             // Expiration
            type == OP_BUY ? clrBlue : clrRed
        );
        
        if(ticket < 0) {
            int error = GetLastError();
            Print("Order failed - Error: ", error);
            switch(error) {
                case ERR_INVALID_PRICE:
                    Print("Invalid price level");
                    break;
                case ERR_INVALID_STOPS:
                    Print("Invalid stops");
                    break;
                case ERR_INVALID_TRADE_VOLUME:
                    Print("Invalid lot size");
                    break;
                case ERR_NOT_ENOUGH_MONEY:
                    Print("Not enough money");
                    break;
                default:
                    Print("Other error");
                    break;
            }
        } else {
            Print("Order executed successfully - Ticket: ", ticket);
        }
    }
    else if(StringFind(action, "CLOSEALL") == 0) {
        Print("Executing Close All command");
        int type = -1;
        
        // Check if type is specified
        if(ArraySize(parts) > 1) {
            type = StringToInteger(parts[1]);
            Print("Closing all positions of type: ", type);
        } else {
            Print("Closing all positions");
        }
        
        bool success = true;
        for(int i = OrdersTotal() - 1; i >= 0; i--) {
            if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
                // Check if we should close this position
                if(type == -1 || OrderType() == type) {
                    RefreshRates();
                    double closePrice = OrderType() == OP_BUY ? 
                        MarketInfo(OrderSymbol(), MODE_BID) : 
                        MarketInfo(OrderSymbol(), MODE_ASK);
                        
                    bool result = OrderClose(OrderTicket(), OrderLots(), closePrice, 3);
                    if(!result) {
                        Print("Failed to close order #", OrderTicket(), " Error: ", GetLastError());
                        success = false;
                    } else {
                        Print("Successfully closed order #", OrderTicket());
                    }
                }
            }
        }
        Print("Close All operation completed. Success: ", success);
    }
    else if(action == "CLOSE") {
        if(ArraySize(parts) < 2) return;
        
        int ticket = StringToInteger(parts[1]);
        double lots = OrderLots(); // Default to full position
        
        // If partial close is requested
        if(ArraySize(parts) > 2) {
            double percentage = StringToDouble(parts[2]);
            if(percentage > 0 && percentage < 100) {
                lots = NormalizeDouble(OrderLots() * percentage / 100, 2);
            }
        }
        
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            RefreshRates();
            double closePrice = OrderType() == OP_BUY ? 
                MarketInfo(OrderSymbol(), MODE_BID) : 
                MarketInfo(OrderSymbol(), MODE_ASK);
                
            bool result = OrderClose(ticket, lots, closePrice, 3);
            if(!result) {
                Print("Failed to close order #", ticket, " Error: ", GetLastError());
            } else {
                Print("Successfully closed order #", ticket, " Lots: ", lots);
            }
        }
    }
    else if(action == "MODIFY") {
        if(ArraySize(parts) < 4) return;
        
        int ticket = StringToInteger(parts[1]);
        double sl = StringToDouble(parts[2]);
        double tp = StringToDouble(parts[3]);
        
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            bool result = OrderModify(ticket, OrderOpenPrice(), sl, tp, 0);
            if(!result) {
                Print("Failed to modify order #", ticket, " Error: ", GetLastError());
            } else {
                Print("Successfully modified order #", ticket);
            }
        }
    }
    else if(action == "BREAKEVEN") {
        if(ArraySize(parts) < 2) return;
        
        int ticket = StringToInteger(parts[1]);
        double pips = 0;
        
        // Optional pips buffer
        if(ArraySize(parts) > 2) {
            pips = StringToDouble(parts[2]);
        }
        
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            double openPrice = OrderOpenPrice();
            double newSL = openPrice;
            
            // Add pips buffer if specified
            if(pips > 0) {
                double pipValue = MarketInfo(OrderSymbol(), MODE_POINT) * 10;
                if(OrderType() == OP_BUY) {
                    newSL += pips * pipValue;
                } else if(OrderType() == OP_SELL) {
                    newSL -= pips * pipValue;
                }
            }
            
            bool result = OrderModify(ticket, openPrice, newSL, OrderTakeProfit(), 0);
            if(!result) {
                Print("Failed to set breakeven for order #", ticket, " Error: ", GetLastError());
            } else {
                Print("Successfully set breakeven for order #", ticket);
            }
        }
    }
    else if(action == "GET_HISTORY") {
        Print("Processing GET_HISTORY command");
        if(ArraySize(parts) < 2) {
            Print("Invalid history command format");
            return;
        }
        
        string period = parts[1];
        string startDate = "";
        string endDate = "";
        
        if(period == "custom" && ArraySize(parts) >= 4) {
            startDate = parts[2];
            endDate = parts[3];
        }
        
        Print("Getting trade history for period: ", period);
        if(period == "custom") {
            Print("Custom period - Start: ", startDate, " End: ", endDate);
        }
        
        string history = GetTradeHistory(period, startDate, endDate);
        Print("Retrieved history: ", history);
        
        if(StringLen(history) == 0) {
            Print("No trade history found for the period");
            return;
        }
        
        // Send history data
        string historyData = "HISTORY|" + history;
        Print("Sending history data: ", historyData);
        
        // Send history data using WebRequest
        char post[];
        StringToCharArray(historyData, post);
        
        string headers = "Content-Type: text/plain\r\n";
        if(StringLen(ApiKey) > 0) {
            headers += "X-API-Key: " + ApiKey + "\r\n";
        }
        
        char result[];
        string result_headers;
        
        ResetLastError();
        int res = WebRequest(
            "POST",                              // Method
            ServerURL + "/api/mt4/update",       // URL
            headers,                             // Headers
            5000,                               // Timeout
            post,                               // Data
            result,                             // Result
            result_headers                      // Response headers
        );
        
        if(res == -1) {
            int error = GetLastError();
            Print("Error sending history - Error code:", error);
            if(error == 4060) {
                Print("Make sure WebRequest is allowed in Tools -> Options -> Expert Advisors");
            }
            return;
        }
        
        string response = CharArrayToString(result);
        Print("Server response: ", response);
        Print("History sent successfully");
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
        Print("Custom period history - Start:", TimeToStr(startTime), " End:", TimeToStr(endTime));
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
//| Extract value from JSON string                                    |
//+------------------------------------------------------------------+
string GetJsonValue(string json, string key)
{
    string searchKey = "\"" + key + "\"";
    int pos = StringFind(json, searchKey);
    if(pos == -1) return "";
    
    pos = StringFind(json, ":", pos);
    if(pos == -1) return "";
    
    pos++;
    while(StringGetChar(json, pos) == ' ') pos++;
    
    if(StringGetChar(json, pos) == '[') {
        int depth = 1;
        int startPos = pos + 1;
        int length = StringLen(json);
        
        for(int i = startPos; i < length; i++) {
            if(StringGetChar(json, i) == '[') depth++;
            if(StringGetChar(json, i) == ']') depth--;
            if(depth == 0) {
                return StringSubstr(json, startPos - 1, i - startPos + 2);
            }
        }
    }
    
    return "";
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

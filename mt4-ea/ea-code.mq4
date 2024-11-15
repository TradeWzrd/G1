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
datetime lastUpdateTime = 0;

//+------------------------------------------------------------------+
//| Send data to server                                                |
//+------------------------------------------------------------------+
bool SendToServer(string data) {
    string url = ServerURL + "/api/mt4/update";
    char post[];
    char result[];
    string resultHeaders;
    string cookie=NULL;
    
    // Add quotes to make it a proper string
    string jsonData = "\"" + StringReplace(data, "\"", "\\\"") + "\"";
    StringToCharArray(jsonData, post);
    
    Print("Sending data: ", jsonData);  // Debug print
    
    ResetLastError();
    int res = WebRequest(
        "POST",                // Method
        url,                   // URL
        cookie,                // Cookie
        NULL,                  // Referer
        5000,                  // Timeout
        post,                  // Post data
        ArraySize(post),       // Data size
        result,                // Result
        resultHeaders          // Response headers
    );
    
    if(res == -1) {
        int error = GetLastError();
        Print("Error in WebRequest: ", error);
        isConnected = false;
        return false;
    } else {
        isConnected = true;
        lastUpdateTime = TimeLocal();
        return true;
    }
}

//+------------------------------------------------------------------+
//| Create account update string                                       |
//+------------------------------------------------------------------+
string CreateUpdateString() {
    string accountInfo = StringFormat("ACCOUNT|%.2f;%.2f;%.2f;%.2f",
        AccountBalance(),
        AccountEquity(),
        AccountMargin(),
        AccountFreeMargin()
    );
    
    string positions = "|POSITIONS|";
    
    for(int i = 0; i < OrdersTotal(); i++) {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
        
        positions += StringFormat("%d,%s,%d,%.2f,%.5f,%.5f,%.5f,%.2f,%.2f,%s;",
            OrderTicket(),
            OrderSymbol(),
            OrderType(),
            OrderLots(),
            OrderOpenPrice(),
            OrderStopLoss(),
            OrderTakeProfit(),
            OrderCommission(),
            OrderProfit(),
            OrderComment()
        );
    }
    
    Print("Created update string: ", accountInfo + positions);  // Debug print
    return accountInfo + positions;
}

//+------------------------------------------------------------------+
//| Check for trade commands                                           |
//+------------------------------------------------------------------+
void CheckTradeCommands() {
    string url = ServerURL + "/api/mt4/commands";
    char result[];
    string resultHeaders;
    char empty[];
    string cookie=NULL;
    
    ArrayResize(empty, 1);
    empty[0] = 0;
    
    ResetLastError();
    int res = WebRequest(
        "GET",                 // Method
        url,                   // URL
        cookie,                // Cookie
        NULL,                  // Referer
        5000,                  // Timeout
        empty,                 // Data
        ArraySize(empty),      // Data size
        result,                // Result
        resultHeaders          // Response headers
    );
    
    if(res != -1) {
        string commands = CharArrayToString(result);
        Print("Received commands: ", commands);  // Debug print
        
        // Skip empty responses
        if(StringLen(commands) > 0 && StringFind(commands, "<!DOCTYPE") == -1) {
            string trimmed = StringTrimRight(StringTrimLeft(commands));
            // Skip empty JSON responses
            if(trimmed != "\"\"" && trimmed != "") {
                // Remove quotes if present
                if(StringGetChar(trimmed, 0) == 34) { // 34 is ASCII for "
                    trimmed = StringSubstr(trimmed, 1, StringLen(trimmed) - 2);
                }
                ProcessCommand(trimmed);
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Process command                                                    |
//+------------------------------------------------------------------+
void ProcessCommand(string command) {
    Print("Processing command: ", command);
    string parts[];
    StringSplit(command, ',', parts);
    
    if(ArraySize(parts) < 2) {
        Print("Invalid command format");
        return;
    }
    
    string action = parts[0];
    string symbol = parts[1];
    
    double lots = 0.01;     // Default lots
    double sl = 0;          // Default stop loss
    double tp = 0;          // Default take profit
    string comment = "Web Terminal";
    
    // Parse parameters
    for(int i = 2; i < ArraySize(parts); i++) {
        string paramParts[];
        StringSplit(parts[i], '=', paramParts);
        if(ArraySize(paramParts) != 2) continue;
        
        string paramName = paramParts[0];
        string paramValue = paramParts[1];
        
        if(paramName == "lots") lots = StringToDouble(paramValue);
        else if(paramName == "sl") sl = StringToDouble(paramValue);
        else if(paramName == "tp") tp = StringToDouble(paramValue);
        else if(paramName == "comment") comment = paramValue;
    }
    
    Print("Action: ", action, ", Symbol: ", symbol, ", Lots: ", lots);
    
    // Execute command
    if(action == "buy") {
        int ticket = OrderSend(symbol, OP_BUY, lots, MarketInfo(symbol, MODE_ASK), 3, sl, tp, comment, MAGICMA);
        if(ticket < 0) Print("Error opening BUY order: ", GetLastError());
        else Print("BUY order opened: Ticket=", ticket);
    }
    else if(action == "sell") {
        int ticket = OrderSend(symbol, OP_SELL, lots, MarketInfo(symbol, MODE_BID), 3, sl, tp, comment, MAGICMA);
        if(ticket < 0) Print("Error opening SELL order: ", GetLastError());
        else Print("SELL order opened: Ticket=", ticket);
    }
    else if(action == "close") {
        int ticket = StringToInteger(symbol);
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            if(OrderType() == OP_BUY) {
                if(!OrderClose(ticket, OrderLots(), MarketInfo(OrderSymbol(), MODE_BID), 3))
                    Print("Error closing BUY order: ", GetLastError());
            }
            else if(OrderType() == OP_SELL) {
                if(!OrderClose(ticket, OrderLots(), MarketInfo(OrderSymbol(), MODE_ASK), 3))
                    Print("Error closing SELL order: ", GetLastError());
            }
        }
    }
    
    // Send immediate update after trade execution
    SendUpdate();
}

//+------------------------------------------------------------------+
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer() {
    SendUpdate();
    CheckTradeCommands();
}

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit() {
    // Extract domain from server URL
    string domain = ServerURL;
    if(StringFind(domain, "https://") == 0) domain = StringSubstr(domain, 8);
    else if(StringFind(domain, "http://") == 0) domain = StringSubstr(domain, 7);
    
    // Check if WebRequest is allowed
    string cookie=NULL;
    char empty[];
    char result[];
    string resultHeaders;
    
    ArrayResize(empty, 1);
    empty[0] = 0;
    
    ResetLastError();
    int ret = WebRequest(
        "GET",                 // Method
        "https://www.google.com", // URL
        cookie,                // Cookie
        NULL,                  // Referer
        500,                   // Timeout
        empty,                // Data
        ArraySize(empty),     // Data size
        result,               // Result
        resultHeaders         // Response headers
    );
    
    if(ret == -1) {
        int err = GetLastError();
        if(err == 4014) {  // ERR_FUNCTION_NOT_ALLOWED
            Print("Please enable Allow WebRequest for listed URL in Tools -> Options -> Expert Advisors");
            Print("Then add these URLs:");
            Print(domain);
            MessageBox(
                "Please enable 'Allow WebRequest for listed URL' in Tools -> Options -> Expert Advisors\n" +
                "Then add this URL:\n" + 
                domain + "\n\n" +
                "After adding the URL, remove and re-add the EA to the chart.",
                "WebRequest Setup Required",
                MB_ICONINFORMATION | MB_OK
            );
            return(INIT_FAILED);
        }
    }
    
    EventSetTimer(UpdateInterval);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();
}

//+------------------------------------------------------------------+
//| Send regular update                                                |
//+------------------------------------------------------------------+
void SendUpdate() {
    string data = CreateUpdateString();
    SendToServer(data);
}

//+------------------------------------------------------------------+
//| Allow WebRequest for URL                                           |
//+------------------------------------------------------------------+
bool AllowWebRequest(string url) {
    string terminal_data_path = TerminalInfoString(TERMINAL_DATA_PATH);
    string filename = terminal_data_path + "\\MQL4\\config\\webservers.ini";
    int handle = FileOpen(filename, FILE_READ|FILE_WRITE|FILE_TXT);
    
    if(handle == INVALID_HANDLE) {
        Print("Error opening webservers.ini");
        return false;
    }
    
    string content = "";
    while(!FileIsEnding(handle)) {
        content += FileReadString(handle) + "\n";
    }
    
    if(StringFind(content, url) < 0) {
        FileSeek(handle, 0, SEEK_END);
        FileWriteString(handle, url + "\n");
    }
    
    FileClose(handle);
    return true;
}

//+------------------------------------------------------------------+
//| Open Buy Order                                                     |
//+------------------------------------------------------------------+
void OpenBuyOrder(string symbol, double risk, double sl, double tp, string comment) {
    double lotSize = CalculateLotSize(symbol, risk);
    int ticket = OrderSend(symbol, OP_BUY, lotSize, MarketInfo(symbol, MODE_ASK), 3, sl, tp, comment, MAGICMA);
    
    if(ticket < 0) {
        Print("Error opening BUY order: ", GetLastError());
    } else {
        Print("BUY order opened: Ticket=", ticket);
    }
}

//+------------------------------------------------------------------+
//| Open Sell Order                                                    |
//+------------------------------------------------------------------+
void OpenSellOrder(string symbol, double risk, double sl, double tp, string comment) {
    double lotSize = CalculateLotSize(symbol, risk);
    int ticket = OrderSend(symbol, OP_SELL, lotSize, MarketInfo(symbol, MODE_BID), 3, sl, tp, comment, MAGICMA);
    
    if(ticket < 0) {
        Print("Error opening SELL order: ", GetLastError());
    } else {
        Print("SELL order opened: Ticket=", ticket);
    }
}

//+------------------------------------------------------------------+
//| Close Trade                                                        |
//+------------------------------------------------------------------+
void CloseTrade(int ticket) {
    if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
        Print("Error selecting order: ", GetLastError());
        return;
    }
    
    if(OrderType() == OP_BUY) {
        if(!OrderClose(ticket, OrderLots(), MarketInfo(OrderSymbol(), MODE_BID), 3)) {
            Print("Error closing BUY order: ", GetLastError());
        }
    }
    else if(OrderType() == OP_SELL) {
        if(!OrderClose(ticket, OrderLots(), MarketInfo(OrderSymbol(), MODE_ASK), 3)) {
            Print("Error closing SELL order: ", GetLastError());
        }
    }
}

//+------------------------------------------------------------------+
//| Modify Trade                                                       |
//+------------------------------------------------------------------+
void ModifyTrade(int ticket, double sl, double tp) {
    if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
        Print("Error selecting order: ", GetLastError());
        return;
    }
    
    if(!OrderModify(ticket, OrderOpenPrice(), sl, tp, 0)) {
        Print("Error modifying order: ", GetLastError());
    }
}

//+------------------------------------------------------------------+
//| Delete Trade                                                       |
//+------------------------------------------------------------------+
void DeleteTrade(int ticket) {
    if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
        Print("Error selecting order: ", GetLastError());
        return;
    }
    
    if(!OrderDelete(ticket)) {
        Print("Error deleting order: ", GetLastError());
    }
}

//+------------------------------------------------------------------+
//| Calculate Lot Size based on Risk                                   |
//+------------------------------------------------------------------+
double CalculateLotSize(string symbol, double riskPercent) {
    double accountValue = AccountBalance();
    double riskAmount = accountValue * riskPercent;
    
    double lotStep = MarketInfo(symbol, MODE_LOTSTEP);
    double minLot = MarketInfo(symbol, MODE_MINLOT);
    double maxLot = MarketInfo(symbol, MODE_MAXLOT);
    
    double lotSize = NormalizeDouble(riskAmount / 1000.0, 2);  // Simple calculation
    lotSize = MathMax(minLot, MathMin(maxLot, lotSize));
    return NormalizeDouble(lotSize, 2);
}

//+------------------------------------------------------------------+
//| Get Trade History                                                  |
//+------------------------------------------------------------------+
string GetTradeHistory(string symbol) {
    string history = "";
    
    for(int i = OrdersHistoryTotal() - 1; i >= 0; i--) {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
        if(OrderMagicNumber() != MAGICMA) continue;
        if(symbol != "ALL" && OrderSymbol() != symbol) continue;
        
        history += StringFormat("%d,%s,%s,%.2f,%.4f,%.4f,%.4f,%.2f,%.2f,%s,%s;",
            OrderTicket(),
            OrderSymbol(),
            OrderType() == OP_BUY ? "buy" : "sell",
            OrderLots(),
            OrderOpenPrice(),
            OrderClosePrice(),
            OrderProfit(),
            OrderCommission(),
            OrderSwap(),
            OrderComment(),
            TimeToStr(OrderCloseTime())
        );
    }
    
    return history;
}

//+------------------------------------------------------------------+
//| Process server response                                            |
//+------------------------------------------------------------------+
void ProcessServerResponse(string response) {
    if(StringLen(response) > 0) {
        ProcessCommand(response);
    }
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick() {
    string status = "Trading Terminal EA\n";
    status += "Server: " + ServerURL + "\n";
    status += "Connected: " + (isConnected ? "Yes" : "No") + "\n";
    if(lastError != "") status += "Last Error: " + lastError + "\n";
    Comment(status);
}

//+------------------------------------------------------------------+
//| String Split Function                                              |
//+------------------------------------------------------------------+
void StringSplit(string str, string sep, string& arr[]) {
    int pos = 0;
    int count = 0;
    
    while(true) {
        int nextPos = StringFind(str, sep, pos);
        if(nextPos == -1) {
            ArrayResize(arr, count + 1);
            arr[count] = StringSubstr(str, pos);
            break;
        }
        
        ArrayResize(arr, count + 1);
        arr[count] = StringSubstr(str, pos, nextPos - pos);
        count++;
        pos = nextPos + StringLen(sep);
    }
}

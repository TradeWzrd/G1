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
//| Get error message by error code                                    |
//+------------------------------------------------------------------+
string GetErrorText(int error_code)
{
    string error_string;
    switch(error_code)
    {
        case 0:   error_string="no error";                                                   break;
        case 1:   error_string="no error, trade conditions not changed";                     break;
        case 2:   error_string="common error";                                              break;
        case 3:   error_string="invalid trade parameters";                                  break;
        case 4:   error_string="trade server is busy";                                      break;
        case 5:   error_string="old version of the client terminal";                        break;
        case 6:   error_string="no connection with trade server";                           break;
        case 7:   error_string="not enough rights";                                         break;
        case 8:   error_string="too frequent requests";                                     break;
        case 9:   error_string="malfunctional trade operation";                            break;
        case 64:  error_string="account disabled";                                          break;
        case 65:  error_string="invalid account";                                           break;
        case 128: error_string="trade timeout";                                             break;
        case 129: error_string="invalid price";                                             break;
        case 130: error_string="invalid stops";                                             break;
        case 131: error_string="invalid trade volume";                                      break;
        case 132: error_string="market is closed";                                          break;
        case 133: error_string="trade is disabled";                                         break;
        case 134: error_string="not enough money";                                          break;
        case 135: error_string="price changed";                                             break;
        case 136: error_string="off quotes";                                                break;
        case 137: error_string="broker is busy";                                            break;
        case 138: error_string="requote";                                                   break;
        case 139: error_string="order is locked";                                           break;
        case 140: error_string="long positions only allowed";                               break;
        case 141: error_string="too many requests";                                         break;
        case 145: error_string="modification denied because order too close to market";      break;
        case 146: error_string="trade context is busy";                                     break;
        case 147: error_string="expirations are denied by broker";                          break;
        case 148: error_string="amount of open and pending orders has reached the limit";    break;
        case 149: error_string="hedging is prohibited";                                     break;
        case 150: error_string="prohibited by FIFO rules";                                  break;
        case 4000: error_string="no error";                                                 break;
        case 4001: error_string="wrong function pointer";                                   break;
        case 4002: error_string="array index is out of range";                             break;
        case 4003: error_string="no memory for function call stack";                        break;
        case 4004: error_string="recursive stack overflow";                                 break;
        case 4005: error_string="not enough stack for parameter";                          break;
        case 4006: error_string="no memory for parameter string";                          break;
        case 4007: error_string="no memory for temp string";                               break;
        case 4008: error_string="not initialized string";                                  break;
        case 4009: error_string="not initialized string in array";                         break;
        case 4010: error_string="no memory for array string";                              break;
        case 4011: error_string="too long string";                                         break;
        case 4012: error_string="remainder from zero divide";                              break;
        case 4013: error_string="zero divide";                                             break;
        case 4014: error_string="unknown command";                                         break;
        case 4015: error_string="wrong jump (never generated error)";                      break;
        case 4016: error_string="not initialized array";                                   break;
        case 4017: error_string="dll calls are not allowed";                              break;
        case 4018: error_string="cannot load library";                                     break;
        case 4019: error_string="cannot call function";                                    break;
        case 4020: error_string="expert function calls are not allowed";                   break;
        case 4021: error_string="not enough memory for temp string returned from function"; break;
        case 4022: error_string="system is busy (never generated error)";                  break;
        case 4050: error_string="invalid function parameters count";                       break;
        case 4051: error_string="invalid function parameter value";                        break;
        case 4052: error_string="string function internal error";                          break;
        case 4053: error_string="some array error";                                        break;
        case 4054: error_string="incorrect series array using";                            break;
        case 4055: error_string="custom indicator error";                                  break;
        case 4056: error_string="arrays are incompatible";                                 break;
        case 4057: error_string="global variables processing error";                       break;
        case 4058: error_string="global variable not found";                               break;
        case 4059: error_string="function is not allowed in testing mode";                 break;
        case 4060: error_string="function is not confirmed";                               break;
        case 4061: error_string="send mail error";                                         break;
        case 4062: error_string="string parameter expected";                               break;
        case 4063: error_string="integer parameter expected";                              break;
        case 4064: error_string="double parameter expected";                               break;
        case 4065: error_string="array as parameter expected";                             break;
        case 4066: error_string="requested history data in update state";                  break;
        case 4099: error_string="end of file";                                             break;
        case 4100: error_string="some file error";                                         break;
        case 4101: error_string="wrong file name";                                         break;
        case 4102: error_string="too many opened files";                                   break;
        case 4103: error_string="cannot open file";                                        break;
        case 4104: error_string="incompatible access to a file";                           break;
        case 4105: error_string="no order selected";                                       break;
        case 4106: error_string="unknown symbol";                                          break;
        case 4107: error_string="invalid price parameter for trade function";              break;
        case 4108: error_string="invalid ticket";                                          break;
        case 4109: error_string="trade is not allowed";                                    break;
        case 4110: error_string="longs are not allowed";                                   break;
        case 4111: error_string="shorts are not allowed";                                  break;
        case 4200: error_string="object is already exist";                                 break;
        case 4201: error_string="unknown object property";                                 break;
        case 4202: error_string="object is not exist";                                     break;
        case 4203: error_string="unknown object type";                                     break;
        case 4204: error_string="no object name";                                          break;
        case 4205: error_string="object coordinates error";                                break;
        case 4206: error_string="no specified subwindow";                                  break;
        default:   error_string="unknown error";
    }
    return(error_string);
}

//+------------------------------------------------------------------+
//| Send data to server                                                |
//+------------------------------------------------------------------+
bool SendToServer(string data) {
    string url = ServerURL + "/api/mt4/update";
    char post[];
    char result[];
    string resultHeaders;
    string cookie=NULL;
    
    // Convert string to char array for sending
    int len = StringLen(data);
    ArrayResize(post, len);
    for(int i = 0; i < len; i++) {
        post[i] = StringGetChar(data, i);
    }
    
    Print("Sending data: ", data);  // Debug print
    
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
        Print("Error in WebRequest: ", error, " - ", GetErrorText(error));
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
    
    string updateString = accountInfo + positions;
    Print("Created update string: ", updateString);  // Debug print
    return updateString;
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
//| Process trade command                                              |
//+------------------------------------------------------------------+
void ProcessCommand(string command) {
    Print("Processing command: ", command);
    string parts[];
    StringSplit(command, ',', parts);
    
    if(ArraySize(parts) < 3) {
        Print("Invalid command format");
        return;
    }
    
    string action = StringLower(parts[0]);  // Convert to lowercase
    string symbol = parts[1];
    double risk = 0.01;  // Default risk
    double sl = 0;       // Default stop loss
    double tp = 0;       // Default take profit
    string comment = "Web Terminal";
    
    // Parse parameters
    for(int i = 2; i < ArraySize(parts); i++) {
        string paramParts[];
        StringSplit(parts[i], '=', paramParts);
        if(ArraySize(paramParts) != 2) continue;
        
        string paramName = StringLower(StringTrimRight(StringTrimLeft(paramParts[0])));
        string paramValue = StringTrimRight(StringTrimLeft(paramParts[1]));
        
        Print("Param: ", paramName, "=", paramValue);  // Debug print
        
        if(paramName == "risk") risk = StringToDouble(paramValue);
        else if(paramName == "sl") sl = StringToDouble(paramValue);
        else if(paramName == "tp") tp = StringToDouble(paramValue);
        else if(paramName == "comment") comment = paramValue;
    }
    
    Print("Executing command - Action: ", action, ", Symbol: ", symbol, ", Risk: ", risk, ", SL: ", sl, ", TP: ", tp);
    
    // Calculate lots based on risk
    double accountBalance = AccountBalance();
    double lotStep = MarketInfo(symbol, MODE_LOTSTEP);
    double minLot = MarketInfo(symbol, MODE_MINLOT);
    double maxLot = MarketInfo(symbol, MODE_MAXLOT);
    double tickValue = MarketInfo(symbol, MODE_TICKVALUE);
    double tickSize = MarketInfo(symbol, MODE_TICKSIZE);
    
    // Calculate lot size based on risk percentage
    double riskAmount = accountBalance * risk / 100;
    double lots = NormalizeDouble(riskAmount / (tickValue / tickSize), 2);
    lots = MathMax(minLot, MathMin(maxLot, NormalizeDouble(lots / lotStep, 0) * lotStep));
    
    Print("Calculated lots: ", lots);
    
    // Execute command
    if(action == "buy" || action == "long" || action == "bull" || action == "bullish") {
        double ask = MarketInfo(symbol, MODE_ASK);
        Print("Opening BUY order at ", ask);
        int ticket = OrderSend(symbol, OP_BUY, lots, ask, 3, sl, tp, comment, MAGICMA);
        if(ticket < 0) {
            int error = GetLastError();
            Print("Error opening BUY order: ", error, " - ", GetErrorText(error));
        }
        else Print("BUY order opened: Ticket=", ticket);
    }
    else if(action == "sell" || action == "short" || action == "bear" || action == "bearish") {
        double bid = MarketInfo(symbol, MODE_BID);
        Print("Opening SELL order at ", bid);
        int ticket = OrderSend(symbol, OP_SELL, lots, bid, 3, sl, tp, comment, MAGICMA);
        if(ticket < 0) {
            int error = GetLastError();
            Print("Error opening SELL order: ", error, " - ", GetErrorText(error));
        }
        else Print("SELL order opened: Ticket=", ticket);
    }
    else if(action == "closelong" || action == "closeshort" || action == "closeall") {
        for(int i = OrdersTotal() - 1; i >= 0; i--) {
            if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
                if(OrderMagicNumber() == MAGICMA && (OrderSymbol() == symbol || action == "closeall")) {
                    if((action == "closelong" && OrderType() == OP_BUY) || 
                       (action == "closeshort" && OrderType() == OP_SELL) ||
                       action == "closeall") {
                        bool result = OrderClose(OrderTicket(), OrderLots(), 
                            OrderType() == OP_BUY ? MarketInfo(OrderSymbol(), MODE_BID) : MarketInfo(OrderSymbol(), MODE_ASK), 
                            3);
                        if(!result) {
                            int error = GetLastError();
                            Print("Error closing order: ", error, " - ", GetErrorText(error));
                        }
                    }
                }
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

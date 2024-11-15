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

//+------------------------------------------------------------------+
//| Send data to server                                                |
//+------------------------------------------------------------------+
void SendToServer(string data) {
    string url = ServerURL + "/api/mt4/update";
    char post[];
    char result[];
    string headers = "Content-Type: text/plain\r\n";
    
    StringToCharArray(data, post);
    
    int res = WebRequest(
        "POST",
        url,
        headers,
        5000,
        post,
        result,
        lastError
    );
    
    if(res == -1) {
        int error = GetLastError();
        Print("Error in WebRequest: ", error);
        isConnected = false;
    } else {
        isConnected = true;
        string response = CharArrayToString(result);
        ProcessServerResponse(response);
    }
}

//+------------------------------------------------------------------+
//| Create account update string                                       |
//+------------------------------------------------------------------+
string CreateUpdateString() {
    string accountInfo = StringFormat("ACCOUNT|%.2f;%.2f;%.2f;%.2f",
        AccountBalance(),
        AccountEquity(),
        AccountProfit(),
        AccountFreeMargin()
    );
    
    string positions = "|POSITIONS|";
    
    for(int i = OrdersTotal() - 1; i >= 0; i--) {
        if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
        if(OrderMagicNumber() != MAGICMA) continue;
        
        positions += StringFormat("%d,%s,%s,%.2f,%.4f,%.4f,%.4f,%.2f,%.2f,%s;",
            OrderTicket(),
            OrderSymbol(),
            OrderType() == OP_BUY ? "buy" : "sell",
            OrderLots(),
            OrderOpenPrice(),
            OrderStopLoss(),
            OrderTakeProfit(),
            OrderCommission(),
            OrderProfit(),
            OrderComment()
        );
    }
    
    return accountInfo + positions;
}

//+------------------------------------------------------------------+
//| Process command from server                                        |
//+------------------------------------------------------------------+
void ProcessCommand(string command) {
    string parts[];
    StringSplit(command, ',', parts);
    
    if(ArraySize(parts) < 2) return;
    
    string action = parts[0];
    string symbol = parts[1];
    
    double risk = 0.01;     // Default risk
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
        
        if(paramName == "risk") risk = StringToDouble(paramValue);
        else if(paramName == "sl") sl = StringToDouble(paramValue);
        else if(paramName == "tp") tp = StringToDouble(paramValue);
        else if(paramName == "comment") comment = paramValue;
    }
    
    // Execute command
    if(action == "buy") OpenBuyOrder(symbol, risk, sl, tp, comment);
    else if(action == "sell") OpenSellOrder(symbol, risk, sl, tp, comment);
    else if(action == "close") CloseTrade(StringToInteger(symbol));
    else if(action == "modify") ModifyTrade(StringToInteger(symbol), sl, tp);
    else if(action == "delete") DeleteTrade(StringToInteger(symbol));
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
    if(StringFind(response, "command") >= 0) {
        // Extract command from response
        int start = StringFind(response, "command") + 10;
        int end = StringFind(response, "\"", start);
        string command = StringSubstr(response, start, end - start);
        ProcessCommand(command);
    }
}

//+------------------------------------------------------------------+
//| Timer function                                                     |
//+------------------------------------------------------------------+
void OnTimer() {
    static datetime lastUpdate = 0;
    datetime currentTime = TimeCurrent();
    
    if(currentTime - lastUpdate >= UpdateInterval) {
        SendUpdate();
        lastUpdate = currentTime;
    }
}

//+------------------------------------------------------------------+
//| Send regular update                                                |
//+------------------------------------------------------------------+
void SendUpdate() {
    string data = CreateUpdateString();
    SendToServer(data);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit() {
    EventSetMillisecondTimer(1000);
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
    EventKillTimer();
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

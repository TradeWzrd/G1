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
    // Format: ACCOUNT|balance;equity;margin;freeMargin|POSITIONS|ticket,symbol,type,lots,openPrice,sl,tp,profit;next_position...
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

    // Split command into parts
    string parts[];
    StringSplit(cmd, ',', parts);
    
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
// Inside ProcessCommand function, add this case:

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
        Print("Closing position: ", ticket);
        
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            RefreshRates();
            double closePrice = OrderType() == OP_BUY ? MarketInfo(OrderSymbol(), MODE_BID) : MarketInfo(OrderSymbol(), MODE_ASK);
            bool result = OrderClose(ticket, OrderLots(), closePrice, 3);
            if(!result) {
                Print("Close failed - Error: ", GetLastError());
            } else {
                Print("Position closed successfully");
            }
        } else {
            Print("Could not select order - Error: ", GetLastError());
        }
    }
    else if(action == "MODIFY") {
        if(ArraySize(parts) < 4) return;
        
        int ticket = StringToInteger(parts[1]);
        double sl = StringToDouble(parts[2]);
        double tp = StringToDouble(parts[3]);
        
        Print("Modifying position: ", ticket, " SL:", sl, " TP:", tp);
        
        if(OrderSelect(ticket, SELECT_BY_TICKET)) {
            bool result = OrderModify(ticket, OrderOpenPrice(), sl, tp, 0);
            if(!result) {
                Print("Modify failed - Error: ", GetLastError());
            } else {
                Print("Position modified successfully");
            }
        } else {
            Print("Could not select order - Error: ", GetLastError());
        }
    }
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
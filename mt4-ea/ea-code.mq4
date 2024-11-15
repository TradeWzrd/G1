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
            else if (StringGetCharacter(StringSubstr(json, colonPos + 1, 1), 0) == '"') {
                int valueStart = StringFind(json, "\"", colonPos) + 1;
                int valueEnd = StringFind(json, "\"", valueStart);
                if (valueStart != 0 && valueEnd != -1) {
                    value = StringSubstr(json, valueStart, valueEnd - valueStart);
                }
            }
            // Handle numeric values
            else {
                int valueStart = colonPos + 1;
                while (StringGetCharacter(StringSubstr(json, valueStart, 1), 0) == ' ') {
                    valueStart++;
                }
                int valueEnd = StringFind(json, ",", valueStart);
                if (valueEnd == -1) {
                    valueEnd = StringFind(json, "}", valueStart);
                }
                if (valueEnd != -1) {
                    value = StringSubstr(json, valueStart, valueEnd - valueStart);
                }
            }
        }
    }
    return value;
}

//+------------------------------------------------------------------+
//| Process command                                                    |
//+------------------------------------------------------------------+
void ProcessCommand(string rawCommand)
{
    Print("Processing command: ", rawCommand);
    
    // Skip if empty command
    if (StringLen(rawCommand) == 0) return;
    
    // Extract command data from JSON format
    string type = ExtractValueFromJson(rawCommand, "type");
    string data = ExtractValueFromJson(rawCommand, "data");
    string timestamp = ExtractValueFromJson(rawCommand, "timestamp");
    
    // Skip if no command data
    if (StringLen(data) == 0) {
        Print("No command data found");
        return;
    }
    
    // Process the command data
    ProcessSingleCommand(data);
}

//+------------------------------------------------------------------+
//| Process a single command                                          |
//+------------------------------------------------------------------+
void ProcessSingleCommand(string command)
{
    // Trim whitespace
    while (StringGetChar(command, 0) == ' ') {
        command = StringSubstr(command, 1);
    }
    while (StringGetChar(command, StringLen(command) - 1) == ' ') {
        command = StringSubstr(command, 0, StringLen(command) - 1);
    }
    
    string parts[];
    int numParts = StringSplit(command, ',', parts);
    if (numParts < 1) return;
    
    // Trim whitespace from action
    string action = parts[0];
    while (StringGetChar(action, 0) == ' ') {
        action = StringSubstr(action, 1);
    }
    while (StringGetChar(action, StringLen(action) - 1) == ' ') {
        action = StringSubstr(action, 0, StringLen(action) - 1);
    }
    
    if(action == "BUY" || action == "SELL") {
        if(numParts < 5) {
            SendError("Invalid buy/sell command format. Expected: BUY/SELL,symbol,lots,sl,tp");
            return;
        }
        
        // Trim whitespace from parameters
        string symbol = parts[1];
        while (StringGetChar(symbol, 0) == ' ') {
            symbol = StringSubstr(symbol, 1);
        }
        while (StringGetChar(symbol, StringLen(symbol) - 1) == ' ') {
            symbol = StringSubstr(symbol, 0, StringLen(symbol) - 1);
        }
        
        // Convert and validate lots
        double lots = StringToDouble(parts[2]);
        if(lots <= 0 || lots > MarketInfo(symbol, MODE_MAXLOT)) {
            SendError("Invalid lot size: " + DoubleToStr(lots, 2) + ". Valid range: " + 
                     DoubleToStr(MarketInfo(symbol, MODE_MINLOT), 2) + " - " + 
                     DoubleToStr(MarketInfo(symbol, MODE_MAXLOT), 2));
            return;
        }
        
        // Convert and validate SL/TP
        double sl = StringToDouble(parts[3]);
        double tp = StringToDouble(parts[4]);
        
        int type = (action == "BUY") ? OP_BUY : OP_SELL;
        
        RefreshRates();
        double price = (type == OP_BUY) ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);
        
        // Validate symbol
        if(MarketInfo(symbol, MODE_DIGITS) == 0) {
            SendError("Invalid symbol: " + symbol);
            return;
        }
        
        // Validate price
        if(price <= 0) {
            SendError("Invalid price: " + DoubleToStr(price, MarketInfo(symbol, MODE_DIGITS)));
            return;
        }
        
        // Validate stops
        if(sl != 0) {
            double minStopLevel = MarketInfo(symbol, MODE_STOPLEVEL) * MarketInfo(symbol, MODE_POINT);
            if(type == OP_BUY && price - sl < minStopLevel) {
                SendError("Stop Loss too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(symbol, MODE_DIGITS)));
                return;
            }
            if(type == OP_SELL && sl - price < minStopLevel) {
                SendError("Stop Loss too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(symbol, MODE_DIGITS)));
                return;
            }
        }
        
        if(tp != 0) {
            double minStopLevel = MarketInfo(symbol, MODE_STOPLEVEL) * MarketInfo(symbol, MODE_POINT);
            if(type == OP_BUY && tp - price < minStopLevel) {
                SendError("Take Profit too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(symbol, MODE_DIGITS)));
                return;
            }
            if(type == OP_SELL && price - tp < minStopLevel) {
                SendError("Take Profit too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(symbol, MODE_DIGITS)));
                return;
            }
        }
        
        Print("Executing order: ", symbol, " ", type, " ", lots, " @ ", price, " sl:", sl, " tp:", tp);
        
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
            string errorMsg = "Order failed - ";
            switch(error) {
                case ERR_INVALID_PRICE:
                    errorMsg += "Invalid price level";
                    break;
                case ERR_INVALID_STOPS:
                    errorMsg += "Invalid stops";
                    break;
                case ERR_INVALID_TRADE_VOLUME:
                    errorMsg += "Invalid lot size";
                    break;
                case ERR_NOT_ENOUGH_MONEY:
                    errorMsg += "Not enough money";
                    break;
                case ERR_TRADE_NOT_ALLOWED:
                    errorMsg += "Trading not allowed";
                    break;
                case ERR_MARKET_CLOSED:
                    errorMsg += "Market closed";
                    break;
                case ERR_TRADE_DISABLED:
                    errorMsg += "Trade disabled";
                    break;
                case ERR_BROKER_BUSY:
                    errorMsg += "Broker busy";
                    break;
                case ERR_REQUOTE:
                    errorMsg += "Requote";
                    break;
                default:
                    errorMsg += "Unknown error: " + error;
            }
            SendError(errorMsg);
        } else {
            Print("Order executed successfully - Ticket: ", ticket);
            SendSuccess("Order executed successfully - Ticket: " + ticket);
        }
    }
    else if(action == "CLOSE" || action == "PARTIAL") {
        if(numParts < 2) {
            SendError("Invalid " + action + " command format. Expected: " + action + ",ticket[,percentage]");
            return;
        }
        
        int ticket = (int)StringToInteger(parts[1]);
        double percentage = action == "CLOSE" ? 100 : 50; // Default to 50% for partial
        
        if(numParts > 2) {
            percentage = StringToDouble(parts[2]);
            if(percentage <= 0 || percentage > 100) {
                SendError("Invalid percentage: " + DoubleToStr(percentage, 2) + ". Valid range: 1.00 - 100.00");
                return;
            }
        }
        
        if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
            SendError("Order not found: " + ticket);
            return;
        }
        
        // Store original values in case we need to restore them
        double origLots = OrderLots();
        double origSL = OrderStopLoss();
        double origTP = OrderTakeProfit();
        
        double lots = origLots;
        if(percentage < 100) {
            lots = NormalizeDouble(lots * percentage / 100, 2);
            if(lots < MarketInfo(OrderSymbol(), MODE_MINLOT)) {
                SendError("Resulting lot size too small: " + DoubleToStr(lots, 2) + ". Minimum lot size: " + DoubleToStr(MarketInfo(OrderSymbol(), MODE_MINLOT), 2));
                return;
            }
        }
        
        RefreshRates();
        double closePrice = OrderType() == OP_BUY ? 
            MarketInfo(OrderSymbol(), MODE_BID) : 
            MarketInfo(OrderSymbol(), MODE_ASK);
            
        bool success = OrderClose(
            ticket,
            lots,
            closePrice,
            3,
            clrRed
        );
        
        if(!success) {
            int error = GetLastError();
            string errorMsg = "Failed to " + action + " order: ";
            switch(error) {
                case ERR_INVALID_PRICE:
                    errorMsg += "Invalid close price";
                    break;
                case ERR_INVALID_TRADE_VOLUME:
                    errorMsg += "Invalid lot size";
                    break;
                case ERR_TRADE_NOT_ALLOWED:
                    errorMsg += "Trading not allowed";
                    break;
                case ERR_MARKET_CLOSED:
                    errorMsg += "Market closed";
                    break;
                case ERR_TRADE_DISABLED:
                    errorMsg += "Trade disabled";
                    break;
                case ERR_BROKER_BUSY:
                    errorMsg += "Broker busy";
                    break;
                case ERR_REQUOTE:
                    errorMsg += "Requote";
                    break;
                default:
                    errorMsg += "Unknown error: " + error;
            }
            SendError(errorMsg);
        } else {
            string successMsg = action == "CLOSE" ? "Order closed successfully" : "Order partially closed successfully";
            Print(successMsg);
            SendSuccess(successMsg);
            
            // If this was a partial close and we still have remaining position
            if(percentage < 100 && success) {
                // Find the new ticket (it's usually the last one)
                for(int i = OrdersTotal() - 1; i >= 0; i--) {
                    if(OrderSelect(i, SELECT_BY_POS) && 
                       OrderSymbol() == Symbol() && 
                       OrderLots() == NormalizeDouble(origLots - lots, 2)) {
                        // Restore original SL/TP on remaining position
                        OrderModify(OrderTicket(), OrderOpenPrice(), origSL, origTP, 0, clrBlue);
                        break;
                    }
                }
            }
        }
    }
    else if(action == "MODIFY") {
        if(numParts < 4) {
            SendError("Invalid modify command format. Expected: MODIFY,ticket,sl,tp");
            return;
        }
        
        int ticket = (int)StringToInteger(parts[1]);
        double newSL = StringToDouble(parts[2]);
        double newTP = StringToDouble(parts[3]);
        
        if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
            SendError("Order not found: " + ticket);
            return;
        }
        
        RefreshRates();
        
        // Validate stops
        double minStopLevel = MarketInfo(OrderSymbol(), MODE_STOPLEVEL) * MarketInfo(OrderSymbol(), MODE_POINT);
        double currentPrice = OrderType() == OP_BUY ? 
            MarketInfo(OrderSymbol(), MODE_BID) : 
            MarketInfo(OrderSymbol(), MODE_ASK);
            
        if(newSL != 0) {
            if(OrderType() == OP_BUY && currentPrice - newSL < minStopLevel) {
                SendError("Stop Loss too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
                return;
            }
            if(OrderType() == OP_SELL && newSL - currentPrice < minStopLevel) {
                SendError("Stop Loss too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
                return;
            }
        }
        
        if(newTP != 0) {
            if(OrderType() == OP_BUY && newTP - currentPrice < minStopLevel) {
                SendError("Take Profit too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
                return;
            }
            if(OrderType() == OP_SELL && currentPrice - newTP < minStopLevel) {
                SendError("Take Profit too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
                return;
            }
        }
        
        bool success = OrderModify(
            ticket,
            OrderOpenPrice(),
            newSL,
            newTP,
            0,
            clrBlue
        );
        
        if(!success) {
            int error = GetLastError();
            string errorMsg = "Failed to modify order: ";
            switch(error) {
                case ERR_INVALID_STOPS:
                    errorMsg += "Invalid stop levels";
                    break;
                case ERR_INVALID_TRADE_PARAMETERS:
                    errorMsg += "Invalid trade parameters";
                    break;
                case ERR_TRADE_NOT_ALLOWED:
                    errorMsg += "Trading not allowed";
                    break;
                case ERR_MARKET_CLOSED:
                    errorMsg += "Market closed";
                    break;
                case ERR_TRADE_DISABLED:
                    errorMsg += "Trade disabled";
                    break;
                default:
                    errorMsg += "Unknown error: " + error;
            }
            SendError(errorMsg);
        } else {
            Print("Order modified successfully");
            SendSuccess("Order modified successfully");
        }
    }
    else if(action == "BE") {
        if(numParts < 2) {
            SendError("Invalid BE command format. Expected: BE,ticket[,lockProfit]");
            return;
        }
        
        int ticket = (int)StringToInteger(parts[1]);
        double lockProfit = numParts > 2 ? StringToDouble(parts[2]) : 0; // Optional profit to lock
        
        if(!OrderSelect(ticket, SELECT_BY_TICKET)) {
            SendError("Order not found: " + ticket);
            return;
        }
        
        RefreshRates();
        
        double openPrice = OrderOpenPrice();
        double currentPrice = OrderType() == OP_BUY ? 
            MarketInfo(OrderSymbol(), MODE_BID) : 
            MarketInfo(OrderSymbol(), MODE_ASK);
            
        // Check if we're in profit
        bool inProfit = (OrderType() == OP_BUY && currentPrice > openPrice) ||
                       (OrderType() == OP_SELL && currentPrice < openPrice);
                       
        if(!inProfit) {
            SendError("Order not in profit, cannot set break even");
            return;
        }
        
        double newSL = openPrice;
        if(lockProfit > 0) {
            // Add locked profit to break even level
            if(OrderType() == OP_BUY) {
                newSL = openPrice + (lockProfit * MarketInfo(OrderSymbol(), MODE_POINT));
            } else {
                newSL = openPrice - (lockProfit * MarketInfo(OrderSymbol(), MODE_POINT));
            }
        }
        
        // Validate stop level
        double minStopLevel = MarketInfo(OrderSymbol(), MODE_STOPLEVEL) * MarketInfo(OrderSymbol(), MODE_POINT);
        if(OrderType() == OP_BUY && currentPrice - newSL < minStopLevel) {
            SendError("Break even level too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
            return;
        }
        if(OrderType() == OP_SELL && newSL - currentPrice < minStopLevel) {
            SendError("Break even level too close to current price. Minimum distance: " + DoubleToStr(minStopLevel, MarketInfo(OrderSymbol(), MODE_DIGITS)));
            return;
        }
        
        bool success = OrderModify(
            ticket,
            OrderOpenPrice(),
            newSL,
            OrderTakeProfit(),
            0,
            clrBlue
        );
        
        if(!success) {
            int error = GetLastError();
            string errorMsg = "Failed to set break even: ";
            switch(error) {
                case ERR_INVALID_STOPS:
                    errorMsg += "Invalid stop level";
                    break;
                case ERR_INVALID_TRADE_PARAMETERS:
                    errorMsg += "Invalid trade parameters";
                    break;
                case ERR_TRADE_NOT_ALLOWED:
                    errorMsg += "Trading not allowed";
                    break;
                default:
                    errorMsg += "Unknown error: " + error;
            }
            SendError(errorMsg);
        } else {
            string successMsg = "Break even set successfully" + (lockProfit > 0 ? " with " + lockProfit + " points locked" : "");
            Print(successMsg);
            SendSuccess(successMsg);
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

//+------------------------------------------------------------------+
//| Send error message to server                                      |
//+------------------------------------------------------------------+
void SendError(string message)
{
    string data = "ERROR|" + message;
    SendToServer(data);
}

//+------------------------------------------------------------------+
//| Send success message to server                                    |
//+------------------------------------------------------------------+
void SendSuccess(string message)
{
    string data = "SUCCESS|" + message;
    SendToServer(data);
}

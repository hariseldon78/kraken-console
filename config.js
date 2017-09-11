const config = {
  "positions" : {
    /* TODO: Differentiate for each quote currency */
    /* close the positions when the total profit exceed this value (must be positive) */
    "takeProfit": 0.3,
    "stopLoss": {
      /* close the positions when the total loss exceed this value (must be negative)*/
      "P_L": -0.15,
      "trailing":{
        /* enable the trailing stop loss, moves it toward the profit when the profit grows
          (distance is expressed in terms of profit, not price) */
        "enabled":true,
        "distance":0.2
      },
      "breakEven":{
        /* moves the stop loss to break even (considering also opening fee * 2)
           when the profit is at least "profit" */
        "enabled":true,
        "profit":0.1
      }
    }
  }
};

module.exports = config;

const config = {
  "positions" : {
    /* TODO: Differentiate for each quote currency */
    /* close the positions when the total profit exceed this value (must be positive) */
    "takeProfit": 19,
    "stopLoss": {
      /* close the positions when the total loss exceed this value (must be negative)*/
      "P_L": -20,
      "trailing":{
        /* enable the trailing stop loss, moves it toward the profit when the profit grows
          (distance is expressed in terms of profit, not price) */
        "enabled":true,
        "distance":10
      },
      "breakEven":{
        /* moves the stop loss to break even (considering also opening fee * 2)
           when the profit is at least "profit" */
        "enabled":true,
        "profit":5
      }
    }
  },

  "assets": [
    /*{
        "symbol": "LTC",
        "kraken": "XLTC",
        "target": 65,
    },*/
    {
      "symbol": "BTC",
      "kraken": "XXBT",
      "target": 3800,
    },
    /*{
        "symbol": "DASH",
        "kraken": "DASH",
        "target": 305,
    },
    {
        "symbol": "XRP",
        "kraken": "XXRP",
        "target": 0.19,
    },
    {
        "symbol": "ETH",
        "kraken": "XETH",
        "target": 290,
    },*/
    {
      "symbol": "ETC",
      "kraken": "XETC",
      "target": 16,
    },
    /*{
        "symbol": "BCH",
        "kraken": "BCH",
        "target": 515,
    },
    {
        "symbol": "XMR",
        "kraken": "XXMR",
        "target": 110,
    },
    {
        "symbol": "ZEC",
        "kraken": "XZEC",
        "target": 230,
    }*/
  ]
};

module.exports = config;

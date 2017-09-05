const KrakenClient = require('kraken-api');

const kraken = new KrakenClient(process.env.APIKey, process.env.APISign,{timeout:30000});

const getBalance = () => {
  return new Promise((resolve, reject) => {
    kraken.api('Balance', null, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data.result);
      }
    });
  });
};

const placeOrder = (pair, type, ordertype, price, volume) => {
  return new Promise((resolve, reject) => {
    const options = {
      pair,
      type,
      ordertype,
      price,
      volume,
    }
    kraken.api('AddOrder', options, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data.result);
      }
    });
  });
};

let timeDiff;
function krakenTs() {
  return new Promise((resolve,reject)=>{
    if (timeDiff==undefined) {
      kraken.api('Time')
        .then(res=>{
          console.log(JSON.stringify(res,undefined,2));
          const now=new Date();
          timeDiff=now.getTime()/1000 - res.result.unixtime;
          resolve(res.result.unixtime);
        })
    } else {
      const now=new Date();
      resolve(now.getTime()/1000 - timeDiff);
    }
  });
}

function wait(seconds) {
  return new Promise(resolve=>{setTimeout(()=>{resolve()},seconds*1000)})
}
Promise.prototype.ifTrue=function(then,_else) {
  this.then(bool=>{
    if (bool) {
      return then();
    } else if (_else!=undefined) {
      return _else();
    }
  })
}
function isSameOrder(order,options) {
  return order.userref == orderTs && order.descr.pair == options.pair && order.descr.ordertype == options.ordertype;
}
function dictToArray(dict) {
  return Object.keys(dict).map(k=>dict[k]);
}
const placeOrderChecked = (options, recursiveCallCount) => {
  return new Promise((resolve,reject)=> {
    recursiveCallCount=recursiveCallCount || 5;
    if (recursiveCallCount<=0) {
      reject('Unable to Add Order');
      return;
    }
    krakenTs()
      .then((orderTs) => {
        options['userref']=orderTs;
        console.log(`Placing order: ${JSON.stringify(options, undefined, 2)}`);
        kraken.api('AddOrder', options)
          .catch(e => {
            // there is an error, but the order could have been received anyway
            console.log(`error adding order:${e}`);
            // check if order is passed through
            wait(4)
              .then(()=>kraken.api('OpenOrders'))
              .then(res => {
                return dictToArray(result.closed)
                  .filter(order => isSameOrder(order,options))
                  .length > 0;
              })
              .ifTrue(
                ()=>{resolve()},
                ()=>{return wait(2)
                  .then(()=>kraken.api('ClosedOrders',{start: orderTs - 50}))
                  .then(res => {
                    return dictToArray(result.open.keys)
                      .filter(order => isSameOrder(order,options))
                      .length > 0;
                  })
                  .ifTrue(
                    ()=>{resolve()},
                    ()=>{
                      console.log('order not fount, retrying');
                      return placeOrderAndWaitFill(options,recursiveCallCount-1);
                    }
                  )
                }
              )
          })
      })

  })
};
/*
error adding order:Error: Service:Unavailable
closed orders:{
  "error": [],
  "result": {
    "closed": {},
    "count": 0
  }
}


 */
const getOpenPositions = () => {
  return new Promise((resolve, reject) => {
    kraken.api('OpenPositions', {docalcs: true}, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data.result);
      }
    })
  });
}

module.exports = {
  getBalance,
  placeOrder,
  placeOrderAndWaitFill,
  getOpenPositions,
};
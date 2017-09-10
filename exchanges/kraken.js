const KrakenClient = require('kraken-api');

const kraken = new KrakenClient(process.env.APIKey, process.env.APISign, {timeout: 30000});

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
	return new Promise((resolve, reject) => {
		if (timeDiff == undefined) {
			kraken.api('Time')
				.then(res => {
					// console.log(JSON.stringify(res, undefined, 2));
					const now = new Date();
					timeDiff = now.getTime() / 1000 - res.result.unixtime;
					resolve(res.result.unixtime);
				})
		} else {
			const now = new Date();
			resolve(now.getTime() / 1000 - timeDiff);
		}
	});
}

function wait(seconds) {
	console.log(`waiting ${seconds} seconds`)
	return new Promise(resolve => {
		setTimeout(() => {
			resolve()
		}, seconds * 1000)
	})
}

Promise.prototype.ifTrue = function (then, _else) {
	this.then(bool => {
		if (bool) {
			return then();
		} else if (_else != undefined) {
			return _else();
		}
	})
}

function isSameOrder(order, options, orderTs) {
	return order.userref == orderTs && order.descr.pair == options.pair && order.descr.ordertype == options.ordertype;
}

function dictToArray(dict) {
	return Object.keys(dict).map(k => dict[k]);
}

const placeOrderChecked = (options, recursiveCallCount = 5) => {
	return new Promise((resolve, reject) => {
		// if(recursiveCallCount==undefined)
		//   recursiveCallCount || 5;
		let orderTs;
		if (recursiveCallCount <= 0) {
			reject('Unable to Add Order');
			return;
		}
		krakenTs()
			.then((ts) => {
				orderTs = ts;
				options['userref'] = Math.floor(orderTs);
				console.log(`Placing order: ${JSON.stringify(options, undefined, 2)}`);
				return kraken.api('AddOrder', options);
			})
			.then(()=>{resolve()})
			.catch(e => {
				// there is an error, but the order could have been received anyway
				console.log(`error adding order:${e}`);
				// check if order is passed through
				return wait(4)
					.then(() => kraken.api('OpenOrders'))
					.then(result => {
						console.log(result);
						if (dictToArray(result.result.open)
								.filter(order => isSameOrder(order, options, orderTs))
								.length > 0) resolve();
						else throw "not found in open orders";
					})
					.catch(() => {
						return wait(4)
							.then(() => kraken.api('ClosedOrders', {start: Math.floor(orderTs - 50)}))
							.then(result => {
								console.log(result);
								if (dictToArray(result.result.closed)
										.filter(order => isSameOrder(order, options, orderTs))
										.length > 0) resolve();
								else
									throw "not found in closed orders";
							})
							.catch(() => {
								console.log('order not fount, retrying');
								return placeOrderChecked(options, recursiveCallCount - 1);
							})
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
	placeOrderChecked,
	getOpenPositions,
};
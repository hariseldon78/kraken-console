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
	console.log(`comparing orders: ${JSON.stringify(order)} =?= ${JSON.stringify(options)}; orderTs=${orderTs}`);
	return order.userref == orderTs && order.descr.pair == options.pair && order.descr.ordertype == options.ordertype;
}

function dictToArray(dict) {
	return Object.keys(dict).map(k => dict[k]);
}

const placeOrderChecked = (options, logger, recursiveCallCount = 10) => {
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
				orderTs = Math.floor(ts);
				options['userref'] = orderTs;
				let order = Object.assign({}, options);

				logger(`Placing order: ${JSON.stringify(order, undefined, 2)}`);
				return kraken.api('AddOrder', order);
			})
			.then(() => {
				logger('resolve 1');
				resolve();
			})
			.catch(e => {
				// there is an error, but the order could have been received anyway
				logger(`error adding order:${e}`);
				// check if order is passed through
				return wait(4)
					.then(() => kraken.api('OpenOrders'))
					.then(result => {
						logger(result);
						if (dictToArray(result.result.open)
								.filter(order => isSameOrder(order, options, orderTs))
								.length > 0) {
							logger('resolve 2');
							resolve();
						} else throw "not found in open orders";
					})
					.catch(() => {
						return wait(4)
							.then(() => kraken.api('ClosedOrders', {start: Math.floor(orderTs - 50)}))
							.then(result => {
								logger(result);
								if (dictToArray(result.result.closed)
										.filter(order => isSameOrder(order, options, orderTs))
										.length > 0) {
									logger('resolve 3');
									resolve();
								}
								else
									throw "not found in closed orders";
							})
							.catch(() => {
								logger('order not fount, retrying');
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
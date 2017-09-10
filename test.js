/* Load .env variables to process.env */
require('dotenv').config();
const KrakenClient = require('kraken-api');

const kraken = new KrakenClient(process.env.APIKey, process.env.APISign, {timeout: 3000});
//
const krakWrap = require('./exchanges/kraken');

function dictToArray(dict) {
	return Object.keys(dict).map(k => dict[k]);
}

// kraken.api('ClosedOrders', {start: 150458000})
//   .then(res => {
//     console.log(`closed orders:${JSON.stringify(res, undefined, 2)}`)
//   })
//   .catch(error => {
//     console.log(JSON.stringify(error, undefined, 2));
//   })
// ;
//
// function wait(seconds) {
//   return new Promise(resolve=>{setTimeout(()=>{resolve()},seconds*1000)})
// }
//
// Promise.prototype.if=function(then,_else) {
//   this.then(bool=>{
//     if (bool) {
//       return then();
//     } else if (_else!=undefined) {
//       return _else();
//     }
//   })
// }
//
// new Promise(resolve=>{resolve(true);})
//   .if(
//     ()=>wait(5)
//       .then(()=>{console.log("it was true")}),
//
//     ()=>wait(1)
//       .then(()=>{console.log("it was false")})
//
//   )

krakWrap.placeOrderChecked({
		pair: "XETHZEUR",
		type: "sell",
		ordertype: 'market',
		volume: 0.02,
		leverage: 2
	})
	.then(()=>{
		console.log('done');
	})
	.catch((error) => {
		console.log('ERROR: unable to execute order', `error: ${error}`);
	});
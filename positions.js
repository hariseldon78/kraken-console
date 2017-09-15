/* Load .env variables to process.env */
require('dotenv').config();

const config = require('./config');
// const cc = require('./utils/cc');
const kraken = require('./exchanges/kraken');
const nodemailer = require('nodemailer');
// const uuid = require('uuid');

let transporter = nodemailer.createTransport({
	service: 'gmail',
	auth:    {
		user: process.env.emailAddress,
		pass: process.env.emailPwd
	}
});

let stopLoss = config.positions.stopLoss.P_L;
const takeProfit = config.positions.takeProfit;
const trailing = config.positions.stopLoss.trailing;
const breakEven = config.positions.stopLoss.breakEven;
// const quoteCurrency = 'EUR';//FIXME
let managingPositions = false;

class Info {
	constructor() {
		this.positions = [];
	}
}

let info = new Info();

const doStuff = (logger, tabler, grapher) => {
	if (managingPositions) return;
	kraken.getOpenPositions()
		.then(data => {
			let positions = [];
			for (k in data) {
				if (data.hasOwnProperty(k)) {
					let position = data[k];
					position['positionid'] = k;
					positions.push(position);
				}
			}
			// logger(positions);
			info.positions = merge(positions.map(p => {
				return {
					pair:       p.pair,
					type:       p.type,
					vol:        p.vol,
					vol_closed: p.vol_closed,
					netPL:      p.net,
					fee:        p.fee
				};
			}));
			// logger(simplified);
			tabler(info.positions.map(p => {
				return {
					pair: p.pair,
					type: p.type,
					vol:  (p.vol - p.vol_closed).toFixed(4),
					net:  (p.netPL - p.fee * 2).toFixed(4)
				};
			}));
			// logger(`positions:${JSON.stringify(simplified, undefined, 2)}`);
			let totalPL = 0;
			positions.forEach(p => {
				totalPL += parseFloat(p.net);
				totalPL -= parseFloat(p.fee) * 2;
			});
			// logger(`unrealized PL=${totalPL.toFixed(4)}`);
			// if (stopLoss > 0) {
			// 	logger(`min possible profit=${stopLoss}`);
			// }
			// else {
			// 	logger(`max possible loss=${-stopLoss}`);
			// }

			if (totalPL < stopLoss || totalPL > takeProfit) {
				closeAllPositions(merge(positions), totalPL, logger);
			}
			else {
				if (trailing.enabled && (totalPL - stopLoss) > trailing.distance) {
					logger('all is good, trailing up the stopLoss.');
					stopLoss = totalPL - trailing.distance;
				}
				if (breakEven.enabled && totalPL > breakEven.profit && stopLoss < 0) {
					stopLoss = 0;
				}
			}
			grapher([{
				title: 'P/L',
				value: totalPL
			}, {
				title: 'SL',
				value: stopLoss
			}]);
		})
		.catch(error => logger(error));
};

function flip(position) {
	let pos = Object.assign({}, position);
	pos.type = (pos.type === 'buy' ? 'sell' : 'buy');
	pos.vol = -pos.vol;
	pos.vol_closed = -pos.vol_closed;
	return pos;
}

function floatify(position) {
	let pos = Object.assign({}, position);
	pos.vol = parseFloat(pos.vol);
	pos.vol_closed = parseFloat(pos.vol_closed);
	pos.fee = parseFloat(pos.fee);
	pos.netPL = parseFloat(pos.netPL);
	return pos;
}

function asBuy(position) {
	let pos = Object.assign({}, position);
	if (pos.type === 'sell') pos = flip(pos);
	return pos;
}

function asPositive(position) {
	let pos = Object.assign({}, position);
	if (pos.vol < 0) pos = flip(pos);
	return pos;
}

function merge(positions) {
	let aggregate = positions.reduce((result, pos) => {
		let p = asBuy(floatify(pos));
		if (!result[p.pair]) {
			result[p.pair] = {
				pair:       p.pair,
				type:       p.type,
				vol:        p.vol,
				vol_closed: p.vol_closed,
				netPL:      p.netPL,
				fee:        p.fee
			};
		}
		else {
			result[p.pair].vol += p.vol;
			result[p.pair].vol_closed += p.vol_closed;
			result[p.pair].fee += p.fee;
			result[p.pair].netPL += p.netPL;
		}
		return result;
	}, {});
	return Object.keys(aggregate).map((k) => asPositive(aggregate[k]));
}

function closeAllPositions(positions, pl, logger) {
	managingPositions = true;
	let previousPromise = new Promise((resolve) => {
		resolve();
	});
	positions.forEach(p => {
		previousPromise = previousPromise.then(() => {
				return closePosition(p,logger);
			})
			.then(() => {
				sendMail('Positions closed', `your position was closed. Approximated total ${pl > 0 ? 'profit' : 'loss'}: ${pl}`, logger);
				managingPositions = false;
			}, (error) => {
				sendMail('ERROR: unable to execute order', `error: ${error}`, logger);
				managingPositions = false;
			});
	});
	// sendMail('Close your positions!')
}

function closePosition(p,logger) {
	// return kraken.placeOrderChecked({
	// 	pair:      p.pair,
	// 	type:      invertOrderType(p.type),
	// 	ordertype: 'market',
	// 	volume:    parseFloat(p.vol) - parseFloat(p.vol_closed),
	// 	leverage:  2
	// }, logger);
	return openPositionMultipleOf(p,-1,logger);
}

// final position=p.vol+coeff*p.vol
function openPositionMultipleOf(p,coeff,logger) {
	let pos = Object.assign({}, p);
	pos.vol-=pos.vol_closed;
	pos.vol*=coeff;
	pos=asPositive(pos);
	logger(`p=${JSON.stringify(p,null,2)}`);
	logger(`pos=${JSON.stringify(pos,null,2)}`);
	return kraken.placeOrderChecked(asPositive({
		pair:      pos.pair,
		type:      pos.type,
		ordertype: 'market',
		volume:    parseFloat(pos.vol) - parseFloat(pos.vol_closed),
		leverage:  2
	}), logger);
}

function invertOrderType(t) {
	if (t === 'sell') {
		return 'buy';
	}
	else {
		return 'sell';
	}
}

function sendMail(subject, text, logger) {
	if (text === undefined) text = subject;
	const mailOptions = {
		from:    'positionsMonitor+' + process.env.emailAddress,
		to:      process.env.emailTo,
		subject: subject,
		text:    text
	};
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			logger(error);
		}
		else {
			logger('Email sent:', info.response);
		}
	});
}
module.exports.closePosition=closePosition;
module.exports.openPositionMultipleOf=openPositionMultipleOf;

module.exports.start = function (logger, tabler, grapher) {
	logger = logger || console.log;
	const tick = 1000 * 20;
	const doit = function () {
		doStuff(logger, tabler, grapher);
	};
	setInterval(doit, tick);
	doit();
};

module.exports.info = info;

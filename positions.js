/* Load .env variables to process.env */
require('dotenv').config();

const config = require('./config');
const cc = require('./utils/cc');
const kraken = require('./exchanges/kraken');
const nodemailer = require('nodemailer');
const uuid = require('uuid');

let transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.emailAddress,
		pass: process.env.emailPwd
	}
});

let stopLoss = config.positions.stopLoss.P_L;
const takeProfit = config.positions.takeProfit;
const trailing = config.positions.stopLoss.trailing;
const breakEven = config.positions.stopLoss.breakEven;

const quoteCurrency = 'EUR';//FIXME

const doStuff = () => {
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
			// console.log(positions);
			const simplified = merge(
				positions.map(p => {
					return {pair: p.pair, type: p.type, vol: p.vol, vol_closed: p.vol_closed, fee: p.fee, netPL: p.net}
				})
			);

			console.log(`positions:${JSON.stringify(simplified, undefined, 2)}`);
			let totalPL = 0;
			positions.forEach(p => {
				totalPL += parseFloat(p.net);
				totalPL -= parseFloat(p.fee) * 2;
			})
			console.log(`unrealized PL=${totalPL.toFixed(4)}`);
			if (stopLoss > 0) {
				console.log(`min possible profit=${stopLoss}`)
			} else {
				console.log(`max possible loss=${-stopLoss}`);
			}

			if (totalPL < stopLoss || totalPL > takeProfit) {
				closeAllPositions(merge(positions), totalPL);
			} else {
				if (trailing.enabled && (totalPL - stopLoss) > trailing.distance) {
					console.log('all is good, trailing up the stopLoss.');
					stopLoss = totalPL - trailing.distance;
				}
				if (breakEven.enabled && totalPL > breakEven.profit && stopLoss < 0) {
					stopLoss = 0;
				}
			}
		})
		.catch(error => console.log(error));
};

const tick = 1000 * 20;
let monitorIntervalId = setInterval(doStuff, tick);
doStuff();

function flip(position) {
	let pos = Object.assign({}, position);
	pos.type = (pos.type == 'buy' ? 'sell' : 'buy');
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
	if (pos.type == 'sell')
		pos = flip(pos);
	return pos;
}

function asPositive(position) {
	let pos = Object.assign({}, position);
	if (pos.vol < 0)
		pos = flip(pos);
	return pos;
}

function merge(positions) {
	let aggregate = positions.reduce((result, pos) => {
		let p = asBuy(floatify(pos));
		if (!result[p.pair]) {
			result[p.pair] = {
				pair: p.pair,
				type: p.type,
				vol: p.vol,
				vol_closed: p.vol_closed,
				netPL: p.netPL,
				fee: p.fee
			};
		} else {
			result[p.pair].vol += p.vol;
			result[p.pair].vol_closed += p.vol_closed;
			result[p.pair].fee += p.fee;
			result[p.pair].netPL += p.netPL;
		}
		return result;
	}, new Object());
	return Object.keys(aggregate).map((k) => asPositive(aggregate[k]));
}

function closeAllPositions(positions, pl) {
	clearInterval(monitorIntervalId);
	positions.forEach(p => {

		kraken.placeOrderChecked({
				pair: p.pair,
				type: invertOrderType(p.type),
				ordertype: 'market',
				volume: parseFloat(p.vol) - parseFloat(p.vol_closed),
				leverage: 2
			})
			.then(() => {
				sendMail('Positions closed', `your position was closed. Approximated total ${pl > 0 ? 'profit' : 'loss'}: ${pl}`)
			})
			.catch((error) => {
				sendMail('ERROR: unable to execute order', `error: ${error}`)
			});
	})
	// sendMail('Close your positions!')

}

function invertOrderType(t) {
	if (t == 'sell') {
		return 'buy';
	} else {
		return 'sell';
	}
}

function sendMail(subject, text) {
	if (text === undefined) text = subject;
	const mailOptions = {
		from: 'positionsMonitor+' + process.env.emailAddress,
		to: process.env.emailTo,
		subject: subject,
		text: text
	};
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log(error);
		}
		else {
			console.log('Email sent:', info.response);
		}
	});
}

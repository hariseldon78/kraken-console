const gui = require('./gui');
const positions = require('./positions');


let logger = function (s) {
	if (typeof s === 'string') s.split('\n').forEach(s => {
		gui.logPanel.log(s);
	});
	else gui.logPanel.log(JSON.stringify(s));
};

function uniq(a) {
	var seen = {};
	return a.filter(function (item) {
		return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	});
};

let tabler = function (objs) {
	if (objs.length == 0) {
		gui.positionsPanel.rows.setItems([]);
	}
	const keys = uniq(objs.map(Object.keys)
		.reduce((acc, current) => acc.concat(current)));
	const data = {
		headers: uniq(objs.map(Object.keys).reduce((acc, current) => acc.concat(current))),
		data:    objs.map(o => {
			return keys.map(k => {
				return o[k] || '';
			});
		})
	};
	gui.positionsPanel.setData(data);
};
/**
 *
 * @param current array of current data, they will be associated to current time and buffered
 * es: [{title:'P_L',value:5},{title:'SL',value:-2}]
 */
let buffers = {};
let grapher = function (current) {
	// logger(current);
	const t = new Date();
	const ts = `${t.getHours()}:${t.getMinutes()}`;
	current.forEach(d => {
		if (!buffers[d.title]) buffers[d.title] = {
			title: d.title,
			x:     [],
			y:     []
		};
		buffers[d.title].x.push(ts);
		buffers[d.title].y.push(d.value);
	});
	gui.graphPanel.setData(Object.keys(buffers).map(k => buffers[k]));
};

function selectedPosition() {
	return positions.info.positions[gui.positionsPanel.rows.selected];
}

function populateCommands() {
	let commands = [{
		title:  'Close position',
		action: ()=>{
			logger(`closing position:${JSON.stringify(selectedPosition(),null,2)}`);
			positions.closePosition(selectedPosition(),logger)
				.then(()=>logger('Done'),(error)=>logger(`error: ${error}`));
		}
	}, {
		title:  'Flip position',
		action: ()=> {
			logger(`flipping position:${JSON.stringify(selectedPosition(),null,2)}`);
			positions.openPositionMultipleOf(selectedPosition(),-2,logger)
				.then(()=>logger('Done'),(error)=>logger(`error: ${error}`));
		}
	}, {
		title:  'Double position',
		action: ()=> {
			logger(`doubling position:${JSON.stringify(selectedPosition(),null,2)}`);
			positions.openPositionMultipleOf(selectedPosition(),1,logger)
				.then(()=>logger('Done'),(error)=>logger(`error: ${error}`));
		}
	}, {
		title:  'Half position',
		action: ()=> {
			logger(`doubling position:${JSON.stringify(selectedPosition(),null,2)}`);
			positions.openPositionMultipleOf(selectedPosition(),-0.5,logger)
				.then(()=>logger('Done'),(error)=>logger(`error: ${error}`));
		}
	}, {
		title:  'New position',
		action: ()=> {
			logger('New position action');
		}
	}, {
		title:  'Move stop loss',
		action: ()=> {
			logger('Move stop loss action');
		}
	}, {
		title:  'Move take profit',
		action: ()=> {
			logger('Move take profit action');
		}
	}];
	let data = [];
	commands.forEach((c) => {
		data.push([c.title]);
	});
	gui.commandsPanel.setData({
		headers: ['command'],
		data:    data
	});
	gui.commandsPanel['onEnter'] = function () {
		commands[gui.commandsPanel.rows.selected].action();
	};

}

gui.start();
gui.positionsPanel.focus();
populateCommands();
positions.start(logger, tabler, grapher);




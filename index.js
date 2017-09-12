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


function populateCommands() {
	let commands = [ {
		title:  'Close position',
		action: function () {
			logger('Close position action');
		}
	}, {
		title:  'Flip position',
		action: function () {
			logger('Flip position action');
		}
	}, {
		title:  'Double position',
		action: function () {
			logger('Double position action');
		}
	}, {
		title:  'New position',
		action: function () {
			logger('New position action');
		}
	},{
		title:  'Move stop loss',
		action: function () {
			logger('Move stop loss action');
		}
	}, {
		title:  'Move take profit',
		action: function () {
			logger('Move take profit action');
		}
	}];
	let data=[]
	commands.forEach((c)=>{
		data.push([c.title]);
	});
	gui.commandsPanel.setData({headers:['command'],data:data});
	gui.commandsPanel['onEnter']=function(){
		commands[gui.commandsPanel.rows.selected].action();
	};

}

gui.start();
populateCommands();
positions.start(logger, tabler, grapher);




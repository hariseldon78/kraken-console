const blessed = require('blessed');
const contrib = require('blessed-contrib');
const config = require('./config');

const screen = blessed.screen();

//create layout and widgets

const grid = new contrib.grid({
	rows:   2,
	cols:   6,
	screen: screen
});


const graph = grid.set(0, 0, 1, 3, contrib.line, {
	minY:		config.positions.stopLoss.P_L,
	maxY:       config.positions.takeProfit,
	label:        'Total P/L',
	showLegend:   true
});
module.exports.graphPanel=graph;

const log = grid.set(1, 0, 1, 6, contrib.log,{
	fg:         'green',
	selectedFg: 'green',
	label:      'Log'
});
module.exports.logPanel=log;

const positions = grid.set(0, 3, 1, 3, contrib.table,{
	keys:          true,
	fg:            'green',
	selectedFg:    'white',
	selectedBg:    'blue',
	interactive:   true,
	label:         'Positions',
	columnSpacing: 1, /*in chars*/
	columnWidth:   [12, 8, 12, 12] /*in chars*/
});
module.exports.positionsPanel=positions;

module.exports.start=function () {

	screen.key(['escape', 'q', 'C-c'], function () {
		return process.exit(0);
	});

// fixes https://github.com/yaronn/blessed-contrib/issues/10
	screen.on('resize', function () {
		graph.emit('attach');
		log.emit('attach');
		positions.emit('attach');
	});

	screen.render();
};

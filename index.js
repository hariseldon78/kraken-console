var blessed = require('blessed');
var contrib = require('blessed-contrib');

var screen = blessed.screen();

//create layout and widgets

var grid = new contrib.grid({
	rows:   2,
	cols:   6,
	screen: screen
});


var graph = grid.set(0, 0, 1, 3, contrib.line, {
	showNthLabel: 5,
	maxY:         100,
	label:        'Total P/L',
	showLegend:   false
});

var log = grid.set(1, 0, 1, 6, contrib.log,{
	fg:         'green',
	selectedFg: 'green',
	label:      'Log'
});

var positions = grid.set(0, 3, 1, 3, contrib.table,{
	keys:          true,
	fg:            'green',
	selectedFg:    'white',
	selectedBg:    'blue',
	interactive:   true,
	label:         'Positions',
	width:         '30%',
	height:        '30%',
	border:        {
		type: 'line',
		fg:   'cyan'
	},
	columnSpacing: 10, /*in chars*/
	columnWidth:   [10, 8, 8, 8] /*in chars*/
});

screen.key(['escape', 'q', 'C-c'], function (ch, key) {
	return process.exit(0);
});

// fixes https://github.com/yaronn/blessed-contrib/issues/10
screen.on('resize', function () {
	graph.emit('attach');
	log.emit('attach');
	positions.emit('attach');
});

screen.render();

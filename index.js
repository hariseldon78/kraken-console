const gui = require('./gui');
const positions = require('./positions');


gui.start();
let logger = function (s) {
	if (typeof s === 'string') s.split('\n').forEach(s => {
		gui.logPanel.log(s);
	});
	else gui.logPanel.log(s);
};
positions.start(logger);

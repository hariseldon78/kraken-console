const gui = require('./gui');
const positions = require('./positions');


gui.start();
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
	if (objs.length==0) {
		gui.positionsPanel.rows.setItems([]);
	}
	const keys = uniq(objs.map(Object.keys)
		.reduce((acc, current) => acc.concat(current)));
	const data={
		headers: uniq(objs.map(Object.keys).reduce((acc,current)=>acc.concat(current))),
		data:    objs.map(o=>{
			return keys.map(k=>{
				return o[k] ||''
			})
		})
	};
	gui.positionsPanel.setData(data);
};
/**
 *
 * @param current array of current data, they will be associated to current time and buffered
 * es: [{title:'P_L',value:5},{title:'SL',value:-2}]
 */
let buffers={};
let grapher= function(current) {
	// logger(current);
	const t=new Date();
	const ts=`${t.getHours()}:${t.getMinutes()}`;
	current.forEach(d=>{
		if (!buffers[d.title]) buffers[d.title]={title:d.title,x:[],y:[]};
		buffers[d.title].x.push(ts);
		buffers[d.title].y.push(d.value);
	});
	gui.graphPanel.setData(Object.keys(buffers).map(k=>buffers[k]));
};
// tabler([{a:1},{b:2,c:1,d:4}]);
// gui.positionsPanel.setData({headers:['a','b','c','d','e'],data:[[1,2,'c',4,5]]});
positions.start(logger, tabler, grapher);

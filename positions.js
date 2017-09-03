/* Load .env variables to process.env */
require('dotenv').config();

const config = require('./config');
const cc = require('./utils/cc');
const kraken = require('./kraken');
const nodemailer = require('nodemailer');

let transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.emailAddress,
        pass:process.env.emailPwd
    }
});

let minProfit=config.minProfit;
let maxProfit=config.maxProfit;
let trailDistance=config.trailDistance;

const doStuff = () => {
    kraken.getOpenPositions()
        .then(data=>{
            let positions=[];
            for (k in data)
            {
                if (data.hasOwnProperty(k))
                {
                    let position=data[k];
                    position['positionid']=k;
                    positions.push(position);
                }
            }
            const simplified=positions.map(p=>{return {pair:p.pair,type:p.type,vol:p.vol,vol_closed:p.vol_closed,fee:p.fee,netPL:p.net}})
            console.log(`positions:${JSON.stringify(simplified,undefined,2)}`);
            let totalPL=0;
            positions.forEach(p=>{
                totalPL+=parseFloat(p.net);
                totalPL-=parseFloat(p.fee)*2;
            })
            console.log(`unrealized PL=${totalPL.toFixed(4)}`);
            console.log(`max possible loss=${-minProfit}, distance=${totalPL-minProfit}`);

            if (totalPL<minProfit || totalPL>maxProfit) {
                closeAllPositions(positions);
            } else {
                if ((totalPL-minProfit)>trailDistance){
                    console.log('all is good, trailing up the stopLoss.');
                    minProfit=totalPL-trailDistance;
                }
            }
        })
        .catch(error => console.log(error));
};

const tick = 1000 * 60 * 1;
let monitorIntervalId=setInterval(doStuff, tick);
doStuff();

function closeAllPositions(positions){
    clearInterval(monitorIntervalId);
    const mailOptions={
        from:'positionsMonitor+'+process.env.emailAddress,
        to:process.env.emailTo,
        subject:'Close your positions!',
        text:'Close your positions!'
    };
    transporter.sendMail(mailOptions,(error,info)=>{
        if(error) {console.log(error);}
        else {console.log('Email sent:',info.response);}
    });
}

import express from 'express';
import 'regenerator-runtime/runtime';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import logger from 'morgan';
import cron from 'node-cron';
import request from 'request-promise'
const db = mongoose.connection

mongoose.connect('mongodb://134.122.71.253:27017/autolike', { useNewUrlParser: true, useUnifiedTopology: true })
	.then(async() => {
		console.log("Connect success");
		await copyData()
	}) 
	.catch((error) => {
		console.log("connect error" + error)
	})
cron.schedule('*/59 * * * *', async() => {
	// await wanrranty()
})

var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var startDay = start.valueOf()
var endDay = end.valueOf();

const copyData = async() => {
	const data = await db.collection("daily_stat").find({
		closedTime: {
			$gte: startDay - 1814400000,
			$lt: endDay - 1296000000
		}
	}).toArray()

	data.forEach(value => {
		delete value._id
	})
	console.log(data)

	await db.collection("daily_stat_test_3").insertMany(data)
	console.log("done")
} 

const wanrranty = async() => {
	const serviceSuccess = await db.collection("services").distinct("service_code",{
		TimeSuccess: {
	        $gte: startDay - 864000000,
	        $lt: endDay - 864000000
	    },
	    $or: [{
	        status: "Success"
	    }, {
	        status: "pause"
	    }],
	})
	for(const serviceCode of serviceSuccess) {
		const totalWanrranty = await db.collection("service_logs").find({
		    $or: [{
		        checkpoint: true
		    }, {
		        hasavatar: false
		    }],
		    service_code:serviceCode
		}).toArray()

		let mapServiceLog = {}
		totalWanrranty.forEach( value => {
			if( !mapServiceLog[ value.service_code + "-" + value.token ] ) {
				mapServiceLog[ value.service_code + "-" + value.token ] = {}
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalLog'] = 1		
			 	mapServiceLog[ value.service_code + "-" + value.token ]['price'] = value.price
			 	mapServiceLog[ value.service_code + "-" + value.token ]['data'] = []
			 	mapServiceLog[ value.service_code + "-" + value.token ]['data'].push(value)
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = 0
			 	mapServiceLog[ value.service_code + "-" + value.token ]['token'] = value.token
			 	mapServiceLog[ value.service_code + "-" + value.token ]['service_code'] = value.service_code
			} else {
				mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']++
			}
			mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.service_code + "-" + value.token ]['price'] * mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']
		});
		insertDailyStat( Object.values(mapServiceLog)).then(data => {  
			console.log(serviceCode)
		})

		
	}
	console.log('insert xong tổng bảo hành')
	console.log('UpdateTime:' + new Date())
}

function insertDailyStat(listServiceCodeToken, startDay) {
	 return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				service_code:value.service_code,
       		}

       		let paramInsert = {
       			totalWanrranty:value.totalLog,
       			warrantyCosts:value.totalPrice,
				updated_at:new Date().valueOf()
       		}

            Promise.resolve( db.collection("daily_stat").findOneAndUpdate(paramUpdate, {$set: paramInsert},{ upsert: true}) )
            .then(result => {
                results[index] = result;
                completed += 1;
                
                if (completed == listServiceCodeToken.length) {
                    resolve(results);
                }
            }).catch(err => reject(err));
       });
    });
}




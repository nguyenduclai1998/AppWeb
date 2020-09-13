import express from 'express';
import 'regenerator-runtime/runtime';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import logger from 'morgan';
import asyncRedis from "async-redis";
import cron from 'node-cron';
import redis from 'redis'
import request from 'request-promise'
const db = mongoose.connection
const client = 	redis.createClient({
	host: '127.0.0.1',
	port: 6379
});
client.on('error', (err) => {
	console.log("Error" + err)
})

mongoose.connect('mongodb://134.122.71.253:27017/autolike', { useNewUrlParser: true, useUnifiedTopology: true })
	.then(async() => {
		console.log("Connect success");
	}) 
	.catch((error) => {
		console.log("connect error" + error)
	})
cron.schedule('*/240 * * * *', async() => {
	await wanrranty()
})

var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var startDay = start.valueOf()
var endDay = end.valueOf();

const wanrranty = async() => {
	const totalWanrranty = await db.collection("service_logs").find({
	    $or: [{
	        checkpoint: true
	    }, {
	        hasavatar: false
	    }],
	    closedTime:{
			$gte:startDay - 86400000,
			$lt: endDay - 86400000
		}
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
		console.log('xong 1 service')
	})
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




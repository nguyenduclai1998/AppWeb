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
	.then(async () => {
		console.log("Connect success")
		await pushDataServiceLog()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})

cron.schedule('*/5 * * * *', async() => {
	// console.log("------------dang chay cron------------")
	
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const pushDataServiceLog = async() => {
	//Tinh thoi gian bat dau trong ngay
	var start = new Date();
	start.setHours(0,0,0,0);
	var startDay = start.valueOf()
	//Tinh thoi gian ket thuc trong ngay
	var end = new Date();
	end.setHours(23,59,59,999);
	var endDay = end.valueOf()

	const listServiceLog = await db.collection("service_logs").find({
		createdAt: {
	        $gte: 1598979600000,
	        $lt: 1599065999999
	    },
	}).toArray()

	let mapServiceLog = {}
	listServiceLog.forEach( value => {
		if( !mapServiceLog[ value.type + "-" + value.token ] ) {
			mapServiceLog[ value.type + "-" + value.token ] = {}
		 	mapServiceLog[ value.type + "-" + value.token ]['totalLog'] = 1		
		 	mapServiceLog[ value.type + "-" + value.token ]['price'] = value.price
		 	mapServiceLog[ value.type + "-" + value.token ]['data'] = []
		 	mapServiceLog[ value.type + "-" + value.token ]['data'].push(value)
		 	mapServiceLog[ value.type + "-" + value.token ]['totalPrice'] = 0
		 	mapServiceLog[ value.type + "-" + value.token ]['token'] = value.token
		 	mapServiceLog[ value.type + "-" + value.token ]['service_code'] = value.service_code
		 	mapServiceLog[ value.type + "-" + value.token ]['type'] = value.type
		} else {
			mapServiceLog[ value.type + "-" + value.token ]['totalLog']++
		}
		mapServiceLog[ value.type + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.type + "-" + value.token ]['price'] * mapServiceLog[ value.type + "-" + value.token ]['totalLog']
	});
	
	insertDailyStat( Object.values(mapServiceLog), startDay).then(data => {  
		console.log(data)
	})

}


function insertDailyStat(listServiceCodeToken, startDay) {
	 return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				type: value.type,
				price: value.price,
				startTime:startDay,
       		}

       		let paramInsert = {
				total: value.totalLog,
				amount: value.totalPrice,
				updated_at:new Date().valueOf()
       		}

            Promise.resolve( db.collection("daily_today").updateOne(paramUpdate, {$setOnInsert: paramInsert},{ upsert: true}) )
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
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
		//await pushDataService()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})
cron.schedule('*/5 * * * *', async() => {
	 await pushDataService()
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))


const pushDataService = async() => {
	//Tinh thoi gian bat dau trong ngay
	var start = new Date();
	start.setHours(0,0,0,0);
	var startDay = start.valueOf()
	//Tinh thoi gian ket thuc trong ngay
	var end = new Date();
	end.setHours(23,59,59,999);
	var endDay = end.valueOf()
	console.log(startDay, endDay)

	let listServiceCode = await db.collection("services").distinct("service_code", {
		status: "Active"
	})

	listServiceCode = [...new Set(listServiceCode)]
	const listServiceLog = await db.collection("service_logs").find({
		service_code: { $in: listServiceCode },
		createdAt: {
	        $gte: startDay,
	        $lt: endDay
	    }
	}).toArray()

	let mapServiceCodeToken = {}

	listServiceLog.forEach(value => {
		if( !mapServiceCodeToken[ value.service_code + "-" + value.token ] ) {
			mapServiceCodeToken[ value.service_code + "-" + value.token ] = {}
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['totalLog'] = 1		
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['price'] = value.price
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['data'] = []
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['data'].push(value)
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['totalPrice'] = 0
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['token'] = value.token
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['service_code'] = value.service_code
		 	mapServiceCodeToken[ value.service_code + "-" + value.token ]['type'] = value.type
		} else {
			mapServiceCodeToken[ value.service_code + "-" + value.token ]['totalLog']++
		}
		mapServiceCodeToken[ value.service_code + "-" + value.token ]['totalPrice'] = mapServiceCodeToken[ value.service_code + "-" + value.token ]['price'] * mapServiceCodeToken[ value.service_code + "-" + value.token ]['totalLog']
	})

	
	insertDailyStat( Object.values(mapServiceCodeToken) ).then(data => {  
		console.log(data)
	})
}


function insertDailyStat(listServiceCodeToken) {
	return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       	//Tinh thoi gian bat dau trong ngay
		var start = new Date();
		start.setHours(0,0,0,0);
		var startDay = start.valueOf()
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				service_code:value.service_code,
				type: value.type,
				price: value.price,
				startTime:startDay
       		}

       		let paramInsert = {
       			status:'Active',
				total: value.totalLog,
				amount: value.totalPrice,
				updated_at:new Date().valueOf()
       		}

            Promise.resolve( db.collection("daily_stat").updateOne(paramUpdate, {$setOnInsert: paramInsert},{ upsert: true}) )
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

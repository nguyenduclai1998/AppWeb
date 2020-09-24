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
		await dataServiceSuccess()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})

cron.schedule('*/59 * * * *', async() => {
	await dataServiceSuccess()
	
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

var start = new Date();
start.setHours(0,0,0,0);
var startDay = start.valueOf()
//Tinh thoi gian ket thuc trong ngay
var end = new Date();
end.setHours(23,59,59,999);
var endDay = end.valueOf()

const dataServiceSuccess = async() => {
	const serviceSuccess = await db.collection("services").distinct("service_code",{
		TimeSuccess: {
	        $gte: startDay,
	        $lt: endDay
	    },
	    $or: [{
	        status: "Success"
	    }, {
	        status: "pause"
	    }],
	})
	for(const serviceCode of serviceSuccess){
		const listServiceLogs = await db.collection("service_logs").find({
			service_code: serviceCode,
			kind: 1
		}).toArray()
		
		let uniqueServiceLogs = {}
		listServiceLogs.forEach(elments => {
			if(!uniqueServiceLogs [elments.service_code + "-" + elments.uid]) {
				uniqueServiceLogs [elments.service_code + "-" + elments.uid] = {}
				uniqueServiceLogs [elments.service_code + "-" + elments.uid]["price"]= elments.price
				uniqueServiceLogs [elments.service_code + "-" + elments.uid]["token"]= elments.token
				uniqueServiceLogs [elments.service_code + "-" + elments.uid]["service_code"]= elments.service_code
				uniqueServiceLogs [elments.service_code + "-" + elments.uid]["uid"]= elments.uid
				uniqueServiceLogs [elments.service_code + "-" + elments.uid]["type"]= elments.type
			}
		})
		let uniqueServiceLog = Object.values(uniqueServiceLogs)

		dataServiceLog(uniqueServiceLog).then(data => {
			insertDailyStat(data).then(value => {

			})
		})
	}
	console.log('insert xong doanh thu ước tính')
	console.log('UpdateTime:' + new Date())
}

function dataServiceLog(uniqueServiceLog) {
	return new Promise((resolve, reject) => {
		let results = [];
		let completed = 0;
		let mapServiceLog = {}

		uniqueServiceLog.forEach((value, index) => {
			if( !mapServiceLog[ value.service_code + "-" + value.token ] ) {
				mapServiceLog[ value.service_code + "-" + value.token ] = {}
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalLog'] = 1		
			 	mapServiceLog[ value.service_code + "-" + value.token ]['price'] = value.price
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = 0
			 	mapServiceLog[ value.service_code + "-" + value.token ]['token'] = value.token
			 	mapServiceLog[ value.service_code + "-" + value.token ]['service_code'] = value.service_code
			 	mapServiceLog[ value.service_code + "-" + value.token ]['type'] = value.type
			} else {
				mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']++
			}
			mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.service_code + "-" + value.token ]['price'] * mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']
		})
		resolve(Object.values(mapServiceLog));
	})
}

function insertDailyStat(listServiceCodeToken) {
	 return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				type: value.type,
				service_code:value.service_code,
       		}

       		let paramInsert = {
       			finishTime: startDay,
				finishTimeISO:new Date(startDay).toLocaleDateString(),
				closedTime: startDay + 604800000,
				closedTimeISO: new Date(startDay + 604800000).toLocaleDateString(),
       			price: value.price,
       			status: "Success",
				total: value.totalLog,
				amount: value.totalPrice,
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

const test = async() => {
	const data = await db.collection("daily_stat").find({
		token:"RJI2G441ODEWOJFEPI8E4G"
	}).toArray()
	let tien = 0
	for(const item of data) {
		tien = tien + item.amount
	}
	console.log(tien)
}




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
		await dataServiceSuccess()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})

cron.schedule('*/10 * * * *', async() => {
	// await pushDataServiceLog()
	
})

cron.schedule('*/10 * * * *', async() => {
	// await dataServiceSuccess()
	
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

	const listServiceLogs = await db.collection("service_logs").find({
		createdAt: {
	        $gte: startDay,
	        $lt: endDay
	    },
	}).toArray();

	let mapServiceLog = {}
	listServiceLogs.forEach( value => {
		if( !mapServiceLog[ value.type + "-" + value.token ] ) {
			mapServiceLog[ value.type + "-" + value.token ] = {}
		 	mapServiceLog[ value.type + "-" + value.token ]['totalLog'] = 1		
		 	mapServiceLog[ value.type + "-" + value.token ]['price'] = value.price
		 	mapServiceLog[ value.type + "-" + value.token ]['data'] = []
		 	mapServiceLog[ value.type + "-" + value.token ]['data'].push(value)
		 	mapServiceLog[ value.type + "-" + value.token ]['totalPrice'] = 0
		 	mapServiceLog[ value.type + "-" + value.token ]['token'] = value.token
		 	mapServiceLog[ value.type + "-" + value.token ]['type'] = value.type
		} else {
			mapServiceLog[ value.type + "-" + value.token ]['totalLog']++
		}
		mapServiceLog[ value.type + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.type + "-" + value.token ]['price'] * mapServiceLog[ value.type + "-" + value.token ]['totalLog']
	});
	insertDailyToday( Object.values(mapServiceLog), startDay).then(data => {  
		console.log('xong 1 service')
	})
	console.log('insert done')
	console.log('UpdateTime:' + new Date().valueOf())
}

const dataServiceSuccess = async() => {
	//Tinh thoi gian bat dau trong ngay
	var start = new Date();
	start.setHours(0,0,0,0);
	var startDay = start.valueOf()
	//Tinh thoi gian ket thuc trong ngay
	var end = new Date();
	end.setHours(23,59,59,999);
	var endDay = end.valueOf()
	const serviceCodeSuccess = await db.collection("services").distinct("service_code", {
		TimeSuccess: {
	        $gte:startDay,
	        $lt:endDay
	    },
	    status: "Success"
	})
	for(const serviceCode of serviceCodeSuccess) {
		const listServiceLogs = await db.collection("service_logs").find({
			service_code:serviceCode
		}).toArray();
		let mapServiceLog = {}
		listServiceLogs.forEach(value => {
			if(!mapServiceLog[ value.service_code + "-" + value.token ] ) {
				mapServiceLog[ value.service_code + "-" + value.token ] = {}
				mapServiceLog[ value.service_code + "-" + value.token ]['totalLog'] = 1
				mapServiceLog[ value.service_code + "-" + value.token ]['price'] = value.price
				mapServiceLog[ value.service_code + "-" + value.token ]['data'] = []
				mapServiceLog[ value.service_code + "-" + value.token ]['data'].push(value)
				mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = 0
				mapServiceLog[ value.service_code + "-" + value.token ]['token'] = value.token
				mapServiceLog[ value.service_code + "-" + value.token ]['service_code'] = value.service_code
				mapServiceLog[ value.service_code + "-" + value.token ]['type'] = value.type
				mapServiceLog[ value.service_code + "-" + value.token ]['finishTime'] = startDay
				mapServiceLog[ value.service_code + "-" + value.token ]['finishTimeISO'] = new Date(startDay).toISOString()
				mapServiceLog[ value.service_code + "-" + value.token ]['closedTime'] = parseInt(startDay) + parseInt(604800000)
				mapServiceLog[ value.service_code + "-" + value.token ]['closedTimeISO'] = new Date(parseInt(startDay) + parseInt(604800000)).toISOString()
			} else {
				mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']++
			}
			mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.service_code + "-" + value.token ]['totalLog'] * mapServiceLog[ value.service_code + "-" + value.token ]['price']
		});

		insertDailyStat( Object.values(mapServiceLog),startDay).then(data => {  
			
		})
	}
	console.log('xong')
}

function insertDailyToday(listServiceCodeToken, startDay) {
	 return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				type: value.type,
				startTime: startDay
       		}

       		let paramInsert = {
       			price: value.price,
				total: value.totalLog,
				amount: value.totalPrice,
				updated_at:new Date().valueOf()
       		}

            Promise.resolve( db.collection("daily_today").findOneAndUpdate(paramUpdate, {$set: paramInsert},{ upsert: true}) )
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

function insertDailyStat(listServiceCodeToken, startDay) {
	 return new Promise((resolve, reject) => {
       	let results = [];
       	let completed = 0;
       
       	listServiceCodeToken.forEach((value, index) => {
       		let paramUpdate = {
       			token: value.token,
				type: value.type,
				price: value.price,
				service_code:value.service_code,
				finishTime: value.finishTime,
				finishTimeISO:value.finishTimeISO,
				closedTime: value.closedTime,
				closedTimeISO: value.closedTimeISO,
				status: "Success"
       		}

       		let paramInsert = {
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



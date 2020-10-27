import express from 'express';
import 'regenerator-runtime/runtime';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import logger from 'morgan';
import asyncRedis from "async-redis";
import cron from 'node-cron';
import request from 'request-promise'
const db = mongoose.connection

mongoose.connect('mongodb://134.122.71.253:27017/autolike', { useNewUrlParser: true, useUnifiedTopology: true })
	.then(async () => {
		console.log("Connect success");
		await dailyStat()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})
cron.schedule('*/120 * * * *', async() => {
	// await dailyStat()
})

var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var startDay = start.valueOf()
var endDay = end.valueOf();

const dailyStat = async() => {
	console.log("------------------Bắt đầu một chu kì------------------")
	console.log('timeStart: ' + new Date());
	const listServiceCodes = await db.collection("services").distinct("service_code",{
		TimeSuccess: {
	        $gte: 1602435600000,
	        $lt: 1602521999999
	    },
        $or:[{
            status: "Success"
        }, {
            status: "pause"
        }]
	})
	for(const service_code of listServiceCodes) {
		const listServiceLogs = await db.collection("service_logs").find({
			service_code: service_code,
			kind:1
		}).toArray()

		//Xoá bỏ những bản ghi trùng nhau trong service log
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

		let mapServiceLog = {}
		uniqueServiceLog.forEach( value => {
			if( !mapServiceLog[ value.service_code + "-" + value.token ] ) {
				mapServiceLog[ value.service_code + "-" + value.token ] = {}
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalLog'] = 1		
			 	mapServiceLog[ value.service_code + "-" + value.token ]['price'] = value.price
			 	mapServiceLog[ value.service_code + "-" + value.token ]['data'] = []
			 	mapServiceLog[ value.service_code + "-" + value.token ]['data'].push(value)
			 	mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = 0
			 	mapServiceLog[ value.service_code + "-" + value.token ]['token'] = value.token
			 	mapServiceLog[ value.service_code + "-" + value.token ]['service_code'] = value.service_code
			 	mapServiceLog[ value.service_code + "-" + value.token ]['type'] = value.type
			} else {
				mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']++
			}
			mapServiceLog[ value.service_code + "-" + value.token ]['totalPrice'] = mapServiceLog[ value.service_code + "-" + value.token ]['price'] * mapServiceLog[ value.service_code + "-" + value.token ]['totalLog']
		});

		let listServiceLog = Object.values(mapServiceLog)

		for(const value of listServiceLog) {
			let paramUpdate = {
       			token: value.token,
				type: value.type,
				service_code:value.service_code,
       		}

       		let paramInsert = {
       			finishTime: 1602435600000,
				finishTimeISO:new Date(1602435600000).toLocaleDateString(),
				closedTime: 1603040400000,
				closedTimeISO: new Date(1603040400000).toLocaleDateString(),
       			price: value.price,
       			status: "Closed",
				total: value.totalLog,
				amount: value.totalPrice,
				updated_at:new Date().valueOf()
       		}
       		await db.collection("daily_stat").findOneAndUpdate(paramUpdate, {$set: paramInsert},{ upsert: true})
       		.then(result => {
       			// console.log("insert success")
       		}).catch((error) => {
       			console.log('insert error' + error);
       		})

		}
	}

	console.log('endTime: ' + new Date());
	console.log("------------------Kết thúc một chu kì------------------")
}




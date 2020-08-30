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
		await pushDataService()
		console.log("Connect success");
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})
cron.schedule('*/120 * * * * *', async() => {
	// await pushDataService()
})

cron.schedule('*/2 * * * * *', async() => {
	// await popDataService()
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const pushDataService = async() => {

	const tokenServiceLogs = await db.collection("service_logs").distinct("token",{});
	for(const token of tokenServiceLogs) {
		const dataServiceLogs = await db.collection("service_logs").distinct("service_code",{
			token:token,
			closedTime:{
				$gte: 1598659200000,
				$lt: 1598745600000
			}})
		console.log("adas" + dataServiceLogs.length)
		let tongTien = 0;
		for(const item of dataServiceLogs) {
			const serviceCodeCount = await db.collection("service_logs").find({
				service_code:item, 
				token:token
			}).count();
			const dataServiceLog = await db.collection("service_logs").findOne({service_code:item, token:token, finishTime: {$exists: true}});
			const dataServices = await db.collection("services").findOne({service_code:item});
			console.log("token: "+token + ", service_code:" +item, +", Ngay hoan thanh:"+dataServiceLog.finishTime)
			
			await db.collection("daily_stat").updateOne({
				token:token,
				service_code:item,
				type:dataServiceLog.type,
				price:dataServiceLog.price,
				closedTime:dataServiceLog.closedTime,
				closedTimeISO:dataServiceLog.closedTimeISO,
				finishTime:dataServiceLog.finishTime,
				finishTimeISO:dataServiceLog.finishTimeISO,
				status:"Closed",
			}, {
				$setOnInsert: {
					total:serviceCodeCount,
					amount:parseInt(dataServiceLog.price) * parseInt(serviceCodeCount),
				}},
				{
					upsert: true
				}
			)	
			tongTien = parseInt(tongTien) + (parseInt(dataServiceLog.price) * parseInt(serviceCodeCount))
		}	
		console.log("ket thuc vong for thanh cong")
		console.log(tongTien)
	}
}
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
		console.log("Connect success");
		await pushDataServiceActive()
		console.log("done")
	}) 
	.catch((error) => {
		console.log("connect error"+ error)
	})
cron.schedule('*/120 * * * * *', async() => {
	// await pushDataService()
})

cron.schedule('*/2 * * * * *', async() => {
	// await popDataService()
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const pushDataServiceActive = async() => {
	const dataServices = await db.collection("services").find({
		TimeSuccess:{
			$gte: 1597881600000,
			$lt: 1597968000000
		}
	}).toArray();
	for(const service of dataServices) {
		const updateTimes = {
			finishTimeISO:new Date(service.TimeSuccess).toISOString(),
			finishTime:service.TimeSuccess,
			closedTimeISO:new Date(parseInt(service.TimeSuccess) + parseInt(604800000)).toISOString(),
			closedTime:parseInt(service.TimeSuccess) + parseInt(604800000)
		}
		await db.collection("service_logs").updateMany({service_code:service.service_code}, {$set:updateTimes})
		console.log("Done 1 service code:"+service.service_code)
	}

}
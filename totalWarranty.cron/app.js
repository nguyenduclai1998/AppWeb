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
	.then(() => {
		console.log("Connect success");
	}) 
	.catch((error) => {
		console.log("connect error")
	})
cron.schedule('*/5 * * * * *', async() => {
	const data = await db.collection("daily_stat").find({
		closedTime: {
	        $gte: 1600102800000,
	        $lt: 1600189199999
	    },
	    token:"RJI2G441ODEWOJFEPI8E4G",
	    status: "Closed"
	}).toArray()
	let tong = 0
	data.forEach(value => {
		tong = tong + value.total
	});
	console.log(tong)
	// const dataServices = await db.collection("services").find({
	// 	status:"Success",
	// 	created_at: {
	// 		$lte:1597708800000,
	// 		$lt:1597968000000
	// 	}
	// }).toArray()
	// for(const item of dataServices) {
	// 	await waitFor(50);
	// 	const totalWarranty = await db.collection("service_logs").find({$and:[{service_code:item.service_code, checkpoint:true}]}).toArray()
	// 	console.log(totalWarranty.length)
	// 	console.log(item.service_code)
	// 	const total_warranty = {
	// 		total_warranty: totalWarranty.length
	// 	}
	// 	const dataServiceLogs = await db.collection("services").updateMany({service_code:item.service_code}, {$set: total_warranty})
	// 	console.log(total_warranty)
	// }
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
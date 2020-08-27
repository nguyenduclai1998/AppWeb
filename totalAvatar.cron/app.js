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
cron.schedule('*/1 * * * *', async() => {
	const dataServices = await db.collection("services").find({
		status:"Success",
		created_at: {
			$lte:1597622400000,
			$lt:1598054400000
		}
	}).toArray()
	for(const item of dataServices) {
		await waitFor(50);
		const totalNoAvatar = await db.collection("service_logs").find({$and:[{service_code:item.service_code, hasavatar:false}]}).toArray()
		console.log(totalNoAvatar.length)
		console.log(item.service_code)
		const total_not_avatar = {
			totalNoAvatar: totalNoAvatar.length
		}
		const dataServiceLogs = await db.collection("services").updateMany({service_code:item.service_code}, {$set: total_not_avatar})
		console.log(total_not_avatar)
	}
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
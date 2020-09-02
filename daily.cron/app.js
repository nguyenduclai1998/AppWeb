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
		//await pushDataServiceLog()
		console.log("Connect success")
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})

cron.schedule('*/5 * * * *', async() => {
	await pushDataServiceLog()
	
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

	const listTokens = await db.collection("service_logs").distinct("token",{
		createdAt: {
	        $gte: startDay,
	        $lt: endDay
	    },
	})

	for(const token of listTokens) {
		try {
			console.log('abc')
			const likepageCount = await db.collection("service_logs").find({
				token:token,
				createdAt: {
			        $gte: startDay,
			        $lt: endDay
			    },
			    type:"likepage"
			}).count()

			const followCount = await db.collection("service_logs").find({
				token:token,
				createdAt: {
			        $gte: startDay,
			        $lt: endDay
			    },
			    type: "follow"
			}).count()

			await db.collection("daily_today").findOneAndUpdate({
				token:token,
				type:"follow",
				startTime:startDay,
				price:26
			}, {
				$set: {
					total:followCount,
					amount:followCount * 26,
					updated_at:new Date().valueOf()
				}
			}, {upsert: true})


			await db.collection("daily_today").findOneAndUpdate({
				token:token,
				type:"likepage",
				startTime:startDay,
				price:47
			}, {
				$set: {
					total:likepageCount,
					amount:likepageCount * 47,
					updated_at:new Date().valueOf()
				}
			}, {upsert: true})
		} catch(e) {
			console.log(e);
		}
	}
	console.log('insert done')
	console.log('UpdateTime:' + new Date().valueOf())
}



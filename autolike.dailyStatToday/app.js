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
		await pushDataService()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})
cron.schedule('*/10 * * * *', async() => {
	// await pushDataService()
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

	const listServiceCode = await db.collection("services").distinct("service_code", {
	    status: "Active",
		created_at: {
	        $gte: startDay,
	        $lt: endDay
	    }
	})

	const listToken = await db.collection("service_logs").distinct("token", {})
	for (const token of listToken) {
		for(const service_code of listServiceCode) {
			const service = await db.collection("services").findOne({service_code:service_code})
			const countServiceLog = await db.collection("service_logs").find({
				token: token,
				service_code: service_code
			}).count()

			const serviceLog = await db.collection("service_logs").findOne({
				token: token,
				service_code: service_code
			})
			let paramUpdate = {
				token: token,
				service_code:service_code,
				type: service.type,
				price: serviceLog.price,
				startTime:startDay
			}

			let paramInsert = {
       			status:'Active',
				total: countServiceLog,
				amount: parseInt(countServiceLog) * parseInt(serviceLog.price),
				updated_at:new Date().valueOf()
       		}

			await db.collection("daily_statss_test").updateOne(paramUpdate, {$setOnInsert: paramInsert},{ upsert: true})
		}
	}
}
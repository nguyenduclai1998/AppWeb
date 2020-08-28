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
		console.log("connect error" + error)
	})
cron.schedule('*/5 * * * * *', async() => {
	const tokenDailyStat = await db.collection("daily_stat").distinct("token")
	for(const token of tokenDailyStat) {
		const serviceCodeDailyStat = await db.collection("daily_stat").distinct("service_code", {status:"Closed"})
		for(const serviceCode of serviceCodeDailyStat) {
			const dataServiceLogs = await db.collection("service_logs").find({
			    service_code: serviceCode,
			    token: token,
			    $or: [{
			        checkpoint: true
			    }, {
			        hasavatar: false
			    }]
			}).count()
			console.log("token:" + token + ",service_code" + serviceCode + "tong bao hanh:" +dataServiceLogs )
		}
	}
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
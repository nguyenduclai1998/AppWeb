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
cron.schedule('*/5 * * * *', async() => {
	const tokenDailyStat = await db.collection("daily_stat").distinct("token", {
		closedTime: {
			$gte:1598720400000,
			$lt:1598806800000
		}
	})
	for(const token of tokenDailyStat) {
		const serviceCodeDailyStat = await db.collection("daily_stat").distinct("service_code", {status:"Closed", token:token})
		for(const serviceCode of serviceCodeDailyStat) {
			const dailyStat = await db.collection("daily_stat").findOne({token:token, service_code:serviceCode})
			const totalWanrranty = await db.collection("service_logs").find({
			    service_code: serviceCode,
			    token: token,
			    $or: [{
			        checkpoint: true
			    }, {
			        hasavatar: false
			    }]
			}).count()
			const updateDaily = {
				totalWanrranty: totalWanrranty,
				amount: (parseInt(dailyStat.price) * parseInt(dailyStat.total)) - (parseInt(totalWanrranty) * parseInt(dailyStat.price)),
				warrantyCosts: parseInt(totalWanrranty) * parseInt(dailyStat.price)
			}
			await db.collection("daily_stat").updateOne({token:token, service_code:serviceCode}, {$set:updateDaily})
			console.log("token:" + token + ",service_code" + serviceCode + "tong bao hanh:" +totalWanrranty )
			console.log(updateDaily)
		}
	}
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

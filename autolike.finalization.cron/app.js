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
	client.llen("data_service_logs", async function(err, reply) {
		console.log("So phan tu trong queue la: "+ reply)
		if(reply >= 95000) {
			console.log("So queue trong data_service_logs da du");
		} else {
			const tokenDaily = await db.collection("daily_stat").distinct("token", {})
			for(const token of tokenDaily) {
				const dataDaily = await db.collection("daily_stat").find({
					token:token,
					closedTime: {
						$gte:1598486400000,
						$lt:1598572800000
					}
				}).toArray()
				let amounts = 0
				for(const amount of dataDaily) {
					console.log("token:"+ token + ",amount:"+amount.amount)
					
					amounts = parseInt(amounts)+ parseInt(amount.amount)

				}
				await db.collection("finalization").insertOne({
					token:token,
					amount: amounts,
					status: 0,
					closedTime:1598486400000,
					created_at: new Date().getTime(),
					update_at: new Date().getTime()
				})

				console.log("total:"+amounts)
			}
			
			console.log("Ket thuc vong for thanh cong.")
		}
	})
}
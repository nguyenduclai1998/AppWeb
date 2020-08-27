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
			const dataServiceCode = await db.collection("daily_stat").distinct("service_code", {})
			for(const serviceCode of dataServiceCode) {
				const timeStart = await db.collection("services").findOne({service_code:serviceCode})
				await db.collection("daily_stat").updateMany({service_code:serviceCode}, {$set:{timeStart:timeStart.created_at}})
			}
			console.log("Ket thuc vong for thanh cong.")
		}
	})
}
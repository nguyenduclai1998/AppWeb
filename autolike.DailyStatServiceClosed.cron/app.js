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
	}) 
	.catch((error) => {
		console.log("connect error"+ error)
	})
cron.schedule('*/3 * * * *', async() => {
	await pushDataServiceClosed()
})

cron.schedule('*/3 * * * *', async() => {
	await popDataServiceClosed()
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const pushDataServiceClosed = async() => {
	client.llen("data_service_closed", async function(err, reply) {
		console.log("So phan tu trong queue la: "+ reply)
		if(reply >= 95000) {
			console.log("So queue trong data_service_logs da du");
		} else {
			const dataDailySuccess = await db.collection("daily_stat").find({
				status:"Success"
			}).toArray()
			for(const dailySuccess of dataDailySuccess) {
				client.rpush("data_service_closed", JSON.stringify(dailySuccess), function(err, reply) {

				})
			}
		}
	})
}

const popDataServiceClosed = async() => {
	for(var i = 1; i < 100; i++) {
		client.lpop("data_service_closed", async function(err, reply) {
			if(reply == null || typeof(reply) === "undefined") {
				console.log("Queue rong");
			} else {
				const dataPopQueue = JSON.parse(reply)
				// console.log(dataPopQueue)
				const dataDaily = await db.collection("daily_stat").find({
					finishTime: {
						$gte: new Date().valueOf() - 691200000,
						$lt:new Date().valueOf() - 604800000
					}
				}).toArray()
				for(const daily of dataDaily) {
					const dataUpdate = {
						status:"Closed",
						closedTime: parseInt(daily.finishTime) + parseInt(604800000),
						closedTimeISO:new Date(parseInt(daily.finishTime) + parseInt(604800000)).toISOString()
					}
					await db.collection("daily_stat").updateOne({
						token:dataPopQueue.token,
						service_code:dataPopQueue.service_code
					}, {
						$set:dataUpdate
					})
					console.log(dataUpdate)
				}
			}
		})
	}
}

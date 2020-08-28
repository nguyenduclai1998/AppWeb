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
cron.schedule('*/3 * * * * *', async() => {
	await pushDataServiceSuccess()
})

cron.schedule('*/3 * * * *', async() => {
	// await popDataServiceSuccess()
})

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const pushDataServiceSuccess = async() => {
	client.llen("data_service_success", async function(err, reply) {
		console.log("So phan tu trong queue la: "+ reply)
		if(reply >= 95000) {
			console.log("So queue trong data_service_logs da du");
		} else {
			const dataDailySuccess = await db.collection("daily_stat").find({
				status:"Success"
			}).toArray()
			for(const dailySuccess of dataDailySuccess) {
				console.log(dailySuccess.finishTime)
			}
		}
	})
}

const popDataServiceSuccess = async() => {
	for(var i = 1; i < 500; i++) {
		client.lpop("data_service_success", async function(err, reply) {
			if(reply == null || typeof(reply) === "undefined") {
				console.log("Queue rong");
			} else {
				const dataPopQueue = JSON.parse(reply)
				const dataServiceLog = await db.collection("service_logs").findOne({token:dataPopQueue.token, service_code:dataPopQueue.service_code})
				const dataServiceSuccess = await db.collection("services").findOne({service_code:dataPopQueue.service_code})
				const dataServiceLogsCount = await db.collection("service_logs").find({token:dataPopQueue.token, service_code:dataPopQueue.service_code}).count()
				await waitFor(50)
				await db.collection("daily_statss_test").updateOne({
					token:dataPopQueue.token,
					service_code:dataPopQueue.service_code,
					type:dataServiceLog.type,
					price:dataServiceLog.price,
					timeStart:new Date(dataServiceSuccess.createdAt).valueOf(),
					finishTime: new Date(dataServiceSuccess.TimeSuccess).valueOf(),
					finishTimeISO:new Date(dataServiceSuccess.TimeSuccess).toISOString()
				}, {
					$setOnInsert: {
						status:dataServiceSuccess.status,
						total:dataServiceLogsCount,
						amount:parseInt(dataServiceLogsCount) * parseInt(dataServiceLog.price),
						updated_at:new Date().valueOf()
					}},
					{
						upsert: true
					}
				)	
				console.log("token:"+dataPopQueue.token+", service_code:"+dataPopQueue.service_code+",count:"+dataServiceLogsCount)
				console.log("done 1 ban ghi")
			}
		})
	}
}

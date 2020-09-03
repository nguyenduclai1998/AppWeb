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
	await pushDataServiceLogs();
})

cron.schedule('*/1 * * * *', async() => {
	await popDataServiceLogs();
})

const pushDataServiceLogs = async() => {
	client.llen("service_logs", async function(err, reply) {
		console.log("So phan tu trong queue: "+reply)
		if(reply > 95000) {
			console.log("Queue Service_logs da du");
			console.log("So phan tu trong queue: "+reply)
		} else {

			const dataServiceLogs = await db.collection("service_logs").find({
				checked: {
					$exists: false
				},
				closedTime: {
					$gte:1598806800000,
					$lt:1598893200000
				}
				
			}).limit(5000).toArray()
			for(const item of dataServiceLogs) {
				await waitFor(50);
				await db.collection("service_logs").updateOne({_id:mongoose.Types.ObjectId(item._id)}, {$set:{checked: true}})
				client.rpush("service_logs", JSON.stringify(item), function (err, reply){

				});

			}
		}
	})
}

const popDataServiceLogs = async() => {
	for(var i = 1; i <= 5000; i++) {
		client.lpop("service_logs", async function(err, reply) {
		
		if(reply == null || typeof(reply) === "undefined") {
			console.log("Queue rong")
		} else {
			const dataServiceLogs = JSON.parse(reply)
			const optionId = {
				uri: "http://scorpion.esrax.com/?method=CheckProfiles&object=Api.Facebook&ids="+dataServiceLogs.uid,
				method: "GET",
				json: true,
				body: {

				}
			}
			const result = await postApi(optionId);
			if(result.Data) {
				for(const item of JSON.parse(result.Data)) {
					const updateStatus = {
						hasavatar: true,
						checkpoint: false,
						checktime: (new Date()).getTime()
					}
					if(item.IsCheckPoint === true) {
						updateStatus.checkpoint = true
					} else if(item.HasAvatar === false) {
						updateStatus.hasavatar = false
					}
					await db.collection("service_logs").updateMany({_id:mongoose.Types.ObjectId(dataServiceLogs._id)}, {$set: updateStatus})
					console.log("Update Success")
					console.log(updateStatus)
					console.log("_id:"+dataServiceLogs._id)
					console.log("id facebook:"+item.Id)
				}
			}
		}
	})
   }

}


const postApi = async(options) => {
	let dataResult = [];
	await request(options) 
		.then(function(parsedBody) {
			dataResult = parsedBody
		})
		.catch(function(err) {
			console.log(err)
		})
	return dataResult
}

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));
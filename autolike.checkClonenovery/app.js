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

mongoose.connect('mongodb://138.197.197.201:27017/autofarmer', { useNewUrlParser: true, useUnifiedTopology: true })
	.then(async() => {
		console.log("Connect success");
	}) 
	.catch((error) => {
		console.log("connect error")
	})
cron.schedule('*/50 * * * * *', async() => {
	await pushDataServiceLogs();
})

cron.schedule('*/5 * * * * *', async() => {
	await popDataServiceLogs();
})

const pushDataServiceLogs = async() => {
	client.llen("check_clone_nvrs", async function(err, reply) {
		console.log("So phan tu trong queue: "+reply)
		if(reply > 95000) {
			console.log("Queue Service_logs da du");
			console.log("So phan tu trong queue: "+reply)
		} else {

			const dataServiceLogs = await db.collection("clone_nvrs").distinct("uid",{
				checked: {
			        $exists: false
			    }
			})
			if(dataServiceLogs == 0) {
				console.log('Het data')
			} else {
				for(const item of dataServiceLogs) {
					await db.collection("clone_nvrs").updateOne({uid:item}, 
					    {
					    	$set:{
					    		checked: true
					    	}
					    })
					client.rpush("check_clone_nvrs", JSON.stringify(item), function (err, reply){

					});
				}
			}
		}
	})
}

const popDataServiceLogs = async() => {
	for(var i = 1; i <= 100; i++) {
		client.lpop("check_clone_nvrs", async function(err, reply) {
		if(reply == null || typeof(reply) === "undefined") {
			console.log("Queue rong")
		} else {
			const uid = JSON.parse(reply)
			const optionId = {
				uri: "http://scorpion.esrax.com/?method=CheckProfiles&object=Api.Facebook&ids="+uid,
				method: "GET",
				json: true,
				body: {

				}
			}
			const result = await postApi(optionId);
			if(result.Data) {
				var tongCheckpoint = 1;
				for(const item of JSON.parse(result.Data)) {
					const updateStatus = {
						checkpoint: false,
						checktime: (new Date()).getTime()
					}
					if(item.IsCheckPoint === true) {
						updateStatus.checkpoint = true
						await db.collection("clone_nvrs").updateOne({
							uid:uid,
						}, {
							$set: {action:"checkpoint"}
						})
						tongCheckpoint++
					}else {
						console.log('clone van con song =)))')
					}
					
					console.log("Update Success")
					console.log(updateStatus)
					console.log("_id:"+uid)
					console.log("id facebook:"+item.Id)
				}
				console.log(tongCheckpoint)
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
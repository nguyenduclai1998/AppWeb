import express from 'express';
import 'regenerator-runtime/runtime';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import logger from 'morgan';
import cron from 'node-cron';
import request from 'request-promise'
const db = mongoose.connection

mongoose.connect('mongodb://134.122.71.253:27017/autolike', { useNewUrlParser: true, useUnifiedTopology: true })
	.then(async () => {
		console.log("Connect success");
		await pushDataService()
		await data()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})
// cron.schedule('*/59 * * * *', async() => {
// 	await pushDataService()
// })

var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var startDay = start.valueOf()
var endDay = end.valueOf();

const data = async() => {
	const data = await db.collection("financial").find({
		closedTime: 1603213200000,
	}).toArray()
	let tong = 0
	for(const value of data) {
		tong = tong + value.amount
	}

	console.log(tong)
}
const pushDataService = async() => {
	console.log("------------------Bắt đầu một chu kì------------------")
	console.log('timeStart: ' + new Date());
	const tokenDaily = await db.collection("daily_stat").distinct("token", {
		closedTime:{
			$gte:1603213200000,
			$lte: 1603299599999
		}
	})
	for(const token of tokenDaily) {
		const dataDaily = await db.collection("daily_stat").find({
			token:token,
			status: "Closed",
			closedTime:{
				$gte:1603213200000,
				$lte: 1603299599999
			}
		}).toArray()
		
		if(dataDaily.length == 0) {
			console.log("Data rong: " + token)
		} else {
			let amounts = 0
			for(const amount of dataDaily) {
				if(!amount.warrantyCosts) {
					amounts = parseInt(amounts)+ parseInt(amount.amount)

				} else {
					amounts = parseInt(amounts) + (parseInt(amount.amount) - parseInt(amount.warrantyCosts))

				}
			}

			await db.collection("financial").findOneAndUpdate({
				token:token,
				closedTime: 1603213200000,
			}, {
				$set: {
					closedTimeISO:new Date(1603213200000).toLocaleDateString(),
					update_at:new Date().getTime(),
					amount: amounts,
					status:"Chưa thanh toán",
					statusNumber:0
				}},
				{
					upsert: true
				}
			)	
		}
	}
	
	console.log("startDay: " + (startDay - 259200000), "endDay: " + (endDay - 259200000))
	console.log('endTime: ' + new Date(startDay - 259200000));
	console.log("------------------Kết thúc một chu kì------------------")
}

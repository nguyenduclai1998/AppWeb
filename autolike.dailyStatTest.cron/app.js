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
		await test()
	}) 
	.catch((error) => {
		console.log("connect error"+error)
	})

var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var startDay = start.valueOf()
var endDay = end.valueOf();

const test = async() => {
	console.log("------------------Bắt đầu một chu kì------------------")
	console.log('timeStart: ' + new Date());
	const tokenDaily = await db.collection("daily_stat").distinct("token", {
		closedTime:{
			$gte:1603299600000,
			$lte: 1603385999999
		}
	})
	for(const token of tokenDaily) {
		const dataDaily = await db.collection("daily_stat").find({
			status: "Closed",
			closedTime:{
				$gte:1603731600000,
				$lte: 1603817999999
			},
			token:token
		}).toArray()
		
		if(dataDaily.length == 0) {
			console.log("Data rong: " +token )
		} else {
			let amounts = 0
			for(const amount of dataDaily) {
				if(!amount.warrantyCosts) {
					amounts = parseInt(amounts)+ parseInt(amount.amount)

				} else {
					amounts = parseInt(amounts) + (parseInt(amount.amount) - parseInt(amount.warrantyCosts))

				}
			}
			console.log("LaiDailyToken: " + token  +": " + amounts)
		}
	}

	for(const tokenH of tokenDaily) {
		const dataDailyHong = await db.collection("hongnn_daily_stat2").find({
			status: "Closed",
			closedTime:{
				$gte:1603731600000,
				$lte: 1603817999999
			},
			token:tokenH

		}).toArray()
		
		if(dataDailyHong.length == 0) {
			console.log("Data rong: " + tokenH)
		} else {
			let amountsHong = 0
			for(const amountHong of dataDailyHong) {
				if(!amountHong.warrantyCosts) {
					amountsHong = parseInt(amountsHong)+ parseInt(amountHong.amount)

				} else {
					amountsHong = parseInt(amountsHong) + (parseInt(amountHong.amount) - parseInt(amountHong.warrantyCosts))

				}
			}
			console.log("HongDaily: " + tokenH  +": " + amountsHong)
		}
	}
	
	console.log("------------------Kết thúc một chu kì------------------")
}
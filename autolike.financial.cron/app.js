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

const pushDataService = async() => {
	console.log("------------------Bắt đầu một chu kì------------------")
	console.log('timeStart: ' + new Date());
	const tokenDaily = await db.collection("daily_stat").distinct("token", {
		closedTime:{
			$gte:startDay - 345600000,
			$lte: endDay - 345600000
		}
	})
	// for(const token of tokenDaily) {
		const dataDaily = await db.collection("daily_stat").find({
			token:"RJI2G441ODEWOJFEPI8E4G",
			status: "Closed",
			closedTime:{
				$gte:startDay - 345600000,
				$lte: endDay - 345600000
			}
		}).toArray()
		
		if(dataDaily.length == 0) {
			console.log("Data rong: " + token)
		} else {
			let amounts = 0
			let amount1 = 0
			let warrantyCost = 0
			let totalWanrranty = 0
			let total = 0
			for(const amount of dataDaily) {
				if(!amount.warrantyCosts) {
					amounts = parseInt(amounts)+ parseInt(amount.amount)
					warrantyCost = warrantyCost
					totalWanrranty = totalWanrranty
				} else {
					amounts = parseInt(amounts) + (parseInt(amount.amount) - parseInt(amount.warrantyCosts))
					warrantyCost = parseInt(warrantyCost)+ parseInt(amount.warrantyCosts)
					totalWanrranty = parseInt(totalWanrranty)+ parseInt(amount.totalWanrranty)
				}

				amount1 = parseInt(amount1)+ parseInt(amount.amount)
				total = parseInt(total)+ parseInt(amount.total)
			}

			// await db.collection("financial").findOneAndUpdate({
			// 	token:token,
			// 	closedTime: startDay - 345600000,
			// }, {
			// 	$set: {
			// 		closedTimeISO:new Date(startDay - 345600000).toLocaleDateString(),
			// 		update_at:new Date().getTime(),
			// 		amount: amounts,
			// 		status:"Chưa thanh toán",
			// 		statusNumber:0
			// 	}},
			// 	{
			// 		upsert: true
			// 	}
			// )	
			console.log("tien truoc khi tru bao hanh" + amount1)
			console.log("tien sau khi tru bao hanh" + amounts)
			console.log("tong tien bao hanh" + warrantyCost)
			console.log("Tong so likepage + follow" + total)
			console.log("Tong so likepage + follow bi checkpoint" + totalWanrranty)
		}
	// }
	
	console.log("startDay: " + (startDay - 345600000), "endDay: " + (endDay - 345600000))
	console.log('endTime: ' + new Date(startDay - 345600000));
	console.log("------------------Kết thúc một chu kì------------------")
}

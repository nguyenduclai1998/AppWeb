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
		await pushDataUsers()
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

const pushDataUsers = async() => {
	const dataTransactions = await db.collection("transactions").find({status:"Active"}).toArray()
	let mapTransactions = {}
	for(const value of dataTransactions) {
		// await db.collection("user_historys").insertOne({
		// 	service_code:value.code,
		// 	token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
		// 	number: 1,
		// 	price: value.value,
		// 	type:"nạp tiền",
		// 	createdAt:value.createdAt
		// })
		value.type = "nạp tiền"
		value.number = 1
		value.price = value.value
		value.service_code = value.code
		delete value.date
		delete value._id
		delete value.cron_check
		delete value.updated_at
		delete value.created_at
		delete value.code
		
	}
	console.log(dataTransactions)
	console.log("pushDataUsers done")
}

const pulDataGitCodeUsed = async() => {

	const dataGitCodeUsed = await db.collection("gift_code_used").find({}).toArray()
	for(const gitcode of dataGitCodeUsed) {
		gitcode.service_code = gitcode.code
		gitcode.type = "Nạp gitcode"
		gitcode.price = gitcode.value
		gitcode.number = 1

		delete gitcode._id

		// await db.collection("user_historys").insertOne({
		// 	token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
		// 	service_code:gitcode.code,
		// 	number:1,
		// 	price:gitcode.value,
		// 	type:"Nạp gitcode",
		// 	createdAt:gitcode.createdAt
		// })
	}

	console.log("pulDataGitCodeUsed done")
}

const pupDataServices = async() => {
	const dataServices = await db.collection("services").find({token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK"}).toArray();
	for(const services of dataServices) {
		if (services.status === "pause") {
			await db.collection("user_historys").insertOne({
				token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
				service_code:services.service_code,
				number:services.number,
				price:services.price,
				type:services.type,
				createdAt:services.created_at
			})

			await db.collection("user_historys").insertOne({
				token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
				service_code:services.service_code,
				number:parseInt(services.number) - parseInt(services.number_success),
				price:services.price,
				type:services.type,
				createdAt:services.updateTime ?  new Date(services.updateTime).getTime() : new Date(services.updated_at).getTime(),
				note:"Hủy gói"
			})
		} else {
			await db.collection("user_historys").insertOne({
				token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
				service_code:services.service_code,
				number:services.number,
				price:services.price,
				type:services.type,
				createdAt:services.created_at
			})
		}
		
	}
	console.log("pupDataServices done")
}

const updateMoney = async() => {
	const tokenUser = await db.collection("users").distinct("token", {
		status: "Active"
	})
	// console.log(tokenUser)
	// for(const token of tokenUser) {
	// 	console.log(token)
		const dataHistory = await db.collection("user_historys").find({token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK"}).sort({createdAt:-1}).toArray()
		for(const history of dataHistory) {
			let intoMoney = 0
			if(history.type === "nạp tiền") {
				intoMoney = history.price
				// console.log("nap tien: " + intoMoney)
				await db.collection("user_historys").updateOne({
					token: history.token,
					service_code: history.service_code
				}, {
					$set: {
						intoMoney: intoMoney,
					}
				})
			} else {
				if(history.note === "Hủy gói") {
					intoMoney = history.price * history.number
					// console.log("tien huy goi: " + intoMoney)
					await db.collection("user_historys").updateOne({
						token: history.token,
						service_code: history.service_code,
						note:"Hủy gói"
					}, {
						$set: {
							intoMoney: intoMoney,
						}
					})
				} else {
					if(history.type === "viplikeService" || history.type == "vipcommentService") {
						intoMoney = -(1000 * history.number)
						await db.collection("user_historys").updateOne({
							token: history.token,
							service_code: history.service_code
						}, {
							$set: {
								intoMoney: intoMoney,
							}
						})
					} else {
						intoMoney = -(history.price * history.number)
						// console.log("tien mua goi: " + intoMoney)
						await db.collection("user_historys").updateOne({
							token: history.token,
							service_code: history.service_code
						}, {
							$set: {
								intoMoney: intoMoney,
							}
						})
					}
				}
			}
		}
	// }
}


const sum = async() => {
	const listTranaction = await db.collection("user_historys").find({}).toArray()
	let Sum = 0
    for (const [key, value] of Object.entries(listTranaction)) {
        Sum = parseInt(Sum) + parseInt(value.intoMoney)
        if(value.note) {
        	await db.collection("user_historys").updateOne({
	        	service_code: value.service_code,
	        	token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
	        	note:"Hủy gói"
	        }, {
	        	$set: {
	        		tong: Sum
	        	}
	        })
        } else {
        	await db.collection("user_historys").updateOne({
	        	service_code: value.service_code,
	        	token:"PJTPHKR3835A74BXH98WC3WC3AHA22LK",
	        }, {
	        	$set: {
	        		tong: Sum
	        	}
	        })
        }
        console.log(Sum)
        // value.balance = Sum.toLocaleString()
        // dataView.push(value)
    }
}
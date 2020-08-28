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
		console.log("connect error" + error)
	})
cron.schedule('*/5 * * * * *', async() => {
	
})
const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

const fixBug = async() => {
	const dailyStat = await db.collection("daily_stat").find({
	    amount: {
	        $gte: -10000000,
	        $lt: -1
	    },
	    status: "Closed"
	}).toArray()
	for(const item of dailyStat) {
		
	}
}
const mongoose = require('mongoose')
const { logger } = require('../src/util/log')
const moment = require('moment')


// const mongooseConnection = async (db) => {

//     const options = {
//         useCreateIndex: true,
//         useFindAndModify: false,
//         useNewUrlParser: true,
//         // autoIndex: false,
//         reconnectTries: 30,
//         reconnectInterval: 500,
//         poolSize: 10,
//         bufferMaxEntries: 0
//     }

//     const conn = await mongoose.createConnection(db, options).then((result) => {
        
//         logger.log('info', `${moment()} mongoose connected`)
//         return result
//     }).catch((e) => {
//         console.log(e);
//         logger.log('info', `${moment()} mongoose not connected, retry in 5 seconds`)
//         setTimeout(mongooseConnection, 5000)
//     })
//     if(conn){
//         console.log(conn)
//         return conn
//     }
//     throw new Error('mongoose not connected')
// }

const mongooseConnection = () => {

    const options = {
        useCreateIndex: true,
        useFindAndModify: false,
        useNewUrlParser: true,
        // autoIndex: false,
        reconnectTries: 30,
        reconnectInterval: 500,
        poolSize: 10,
        bufferMaxEntries: 0
    }


    mongoose.connect(process.env.MONGODB_APP_URL, options).then((result) => {
        logger.log('info', `${moment()} mongoose connected`)
    }).catch((e) => {
        logger.log('info', `${moment()} mongoose not connected, retry in 5 seconds`)
        setTimeout(mongooseConnection, 5000)
    })
}

mongooseConnection()

// module.exports = {
//     mongooseConnection 
// }
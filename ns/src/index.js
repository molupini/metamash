const express = require('express')
const app = express()
const { logger } = require('./util/log')
require('../db/pool')

// ROUTERS
// SVC
const svcRouter = require('../router/svc')
// CONTEXT
const contextRouter = require('../router/context')
// APP COMING SOON 
// const appRouter = require('../router/app')

app.use(express.json())
app.use(contextRouter)
app.use(svcRouter)
// COMING SOON 
// app.use(appRouter)

app.use('/healthv', (req, res) => {
    res.status(200).send('healthy')
})

app.listen(process.env.PORT, () => {
    logger.log('info', `PORT=${process.env.PORT}`)
    logger.log('info', `NODE_ENV=${process.env.NODE_ENV}`)
})

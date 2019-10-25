const express = require('express')
const app = express()
const { logger } = require('./util/log')
require('../db/pool')

// import router modules
// const privateConnectorRouter = require('../router/private/connector')

// const privateDatacenterRouter = require('../router/private/datacenter')
// const privateClusterRouter = require('../router/private/cluster')
// const privateDatastoreRouter = require('../router/private/datastore')
// const privateNetworkRouter = require('../router/private/network')
// const privateVmRouter = require('../router/private/vm')

// const publicStateRouter = require('../router/public/state')
// const publicVpcRouter = require('../router/public/vpc')

const connectorRouter = require('../router/connector')
const miscRouter = require('../router/misc')
const contextRouter = require('../router/context')
const resourceRouter = require('../router/resource')
const deploymentRouter = require('../router/deployment')
const configRouter = require('../router/config')
// const mappingRouter = require('../router/mapping')

app.use(express.json())
// Router(s)

// app.use(privateConnectorRouter)
// app.use(privateDatacenterRouter)
// app.use(privateClusterRouter)
// app.use(privateDatastoreRouter)
// app.use(privateNetworkRouter)
// app.use(privateVmRouter)

// app.use(publicStateRouter)
// app.use(publicVpcRouter)

app.use(connectorRouter)
app.use(miscRouter)
app.use(contextRouter)
app.use(resourceRouter)
app.use(deploymentRouter)
app.use(configRouter)

app.use('/healthv', (req, res) => {
    res.status(200).send('healthy')
})


app.listen(process.env.PORT, () => {
    logger.log('info', `PORT=${process.env.PORT}`)
    logger.log('info', `NODE_ENV=${process.env.NODE_ENV}`)
})

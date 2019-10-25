const express = require('express')
const router = new express.Router()
const MainConnector = require('../model/connector')

const { valid } = require('../src/util/compare')
const { logger } = require('../src/util/log')
const auth = require('../middleware/auth')


router.post('/connectors', auth, async (req, res) => {
    try {
        // console.log(req.body)
        const connector = new MainConnector(req.body)
        await connector.save()
        res.status(201).send(connector)
    } catch (e) {
        logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.get('/connectors', async (req, res) => {
    try {
        const connector = await MainConnector.find({})
        res.status(200).send(connector)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/connectors/:id', async (req, res) => {
    try {
        const connector = await MainConnector.findById(req.params.id)
        if(!connector){
            return res.status(404).send({message:'Not Found'})
        }
        if (req.query.populate === 'true') {
            await connector
            .populate([
                {path: 'environments'},
                {path: 'locations'},
                {path: 'networks'},
                {path: 'resources'},
                {path: 'tenants'},
                {path: 'ou'},
                // {path: 'tiers'},
                {path: 'misc'},
                {path: 'perimeters'},
                {path: 'labels'}
            ])
            .execPopulate()
        }
        res.status(200).send({
            connector,
            environments: connector.environments,
            locations: connector.locations,
            networks: connector.networks,
            resources: connector.resources,
            tenants: connector.tenants,
            accounts: connector.ou,
            // tiers: connector.tiers,
            misc: connector.misc,
            perimeters: connector.perimeters,
            labels: connector.labels            
        })
    } catch (e) {
        res.status(500).send(e)
    }
})


// patch connector, with validation and key exclusion
// findByIdAndUpdate() will bypass the middleware which is what we require when posting the changes below
// parse body for allowed fields 
router.patch('/connectors/:id', async (req, res) => {
    const exclude = ['provider', 'groupOrganization', 'location', 'sessionId','_id']
    const isValid = valid(req.body, MainConnector.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const connector = await MainConnector.findById(req.params.id)
        if (!connector) {
            return res.status(404).send({message:'Not Found'})
        }
        // TODO ADD AS QUERY STRING OPTION
        // await connector.refreshData(connector._id)

        const body = Object.keys(req.body)
        body.forEach(value => {
            connector[value] = req.body[value]
        })
        await connector.save()
        res.status(201).send(connector)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// delete connector 
router.delete('/connectors/:id', async (req, res) => {
    try {
        const connector = await MainConnector.findById(req.params.id)
        if (!connector) {
            return res.status(404).send({message:'Not Found'})
        }
        await connector.remove()
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

module.exports = router
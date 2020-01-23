const express = require('express')
const router = new express.Router()

// CONTEXT
// const Environments = require('../model/context/environments')
// const Locations = require('../model/context/locations')
// const Networks = require('../model/context/networks')
const Relationship = require('../model/context/relationship')
// const Tiers = require('../model/context/tiers')
// const Perimeter = require('../model/context/perimeter')
const Connector = require('../model/context/connector')

// APP
// const Resource = require('../model/app/resource')

// const OrganizationalUnit = require('../model/context/ou')
// const MiscConfig = require('../model/misc')

// custom methods
const { valid } = require('../src/util/compare')
const { logger } = require('../src/util/log')
const auth = require('../middleware/auth')


// CONNECTOR
router.post('/context/connector', auth, async (req, res) => {
    try {
        // console.log(req.body)
        const connector = new Connector(req.body)
        await connector.save()
        res.status(201).send(connector)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.get('/context/connector', async (req, res) => {
    try {
        const connector = await Connector.find({})
        res.status(200).send(connector)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.get('/context/connector/:id', async (req, res) => {
    try {
        const connector = await Connector.findById(req.params.id)
        if(!connector){
            return res.status(404).send({message:'Not Found'})
        }
        if (req.query.populate === 'true') {
            await connector
            .populate([
                // {path: 'environments'},
                // {path: 'locations'},
                // {path: 'networks'},
                // {path: 'resources'},
                {path: 'relationship'},
                {path: 'account'}
                // {path: 'tiers'},
                // {path: 'misc'},
                // {path: 'perimeters'},
                // {path: 'labels'}
            ])
            .execPopulate()
        }
        res.status(200).send({
            connector,
            // environments: connector.environments,
            // locations: connector.locations,
            // networks: connector.networks,
            // resources: connector.resources,
            relationship: connector.relationship,
            account: connector.account
            // tiers: connector.tiers,
            // misc: connector.misc,
            // perimeters: connector.perimeters,
            // labels: connector.labels            
        })
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})


// patch connector, with validation and key exclusion
// findByIdAndUpdate() will bypass the middleware which is what we require when posting the changes below
// parse body for allowed fields 
// router.patch('/context/connector/:id', async (req, res) => {
//     const exclude = ['provider', 'groupOrganization', 'location', 'sessionId','_id']
//     const isValid = valid(req.body, Connector.schema.obj, exclude)
//     if (!isValid) {
//         return res.status(400).send({message:'Please provide a valid input'})
//     }
//     try {
//         const connector = await Connector.findById(req.params.id)
//         if (!connector) {
//             return res.status(404).send({message:'Not Found'})
//         }
//         // TODO ADD AS QUERY STRING OPTION
//         // await connector.refreshData(connector._id)

//         const body = Object.keys(req.body)
//         body.forEach(value => {
//             connector[value] = req.body[value]
//         })
//         await connector.save()
//         res.status(201).send(connector)
//     } catch (e) {
//         res.status(500).send({error: e.message})
//     }
// })

router.delete('/context/connector/:id', async (req, res) => {
    try {
        const connector = await Connector.findById(req.params.id)
        if (!connector) {
            return res.status(404).send({message:'Not Found'})
        }
        await connector.remove()
        res.status(200).send()
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send({error: e.message})
    }
})

// RELATIONSHIP
router.post('/context/relationship/:id', auth, async (req, res) => {
    try {
        const relationship = new Relationship({
            owner: req.params.id, 
            ...req.body
        })
        await relationship.save()
        res.status(201).send(relationship)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send({error: e.message})
    }
})

router.post('/context/relationship/:id/seed', auth, async (req, res) => {
    try {
        var relationship = []
        if(Array.isArray(req.body)){
            relationship = await Relationship.seedArray(req.body, req.params.id)
            if(!relationship){
                return res.status(500).send({'error': 'Bad Body'})
            }
        }
        res.status(201).send()
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send()
    }
})


router.get('/context/relationship', async (req, res) => {
    try {
        var match = {}
        var options = {}
        var relationship = null
        var re = null
        options.limit = 10

        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        if (parseInt(req.query.skip) > 1){
            options.skip = parseInt(req.query.skip) 
        }
        if (req.query.parent){
            re = RegExp(req.query.parent)
            match.parent = re
            relationship = await Relationship.find({'keyLabel': {$regex: match.parent}})
            return res.status(200).send(relationship)
        }
        if (req.query.child){
            re = RegExp(req.query.child)
            // debugging
            // console.log(re)
            match.child = re
            relationship = await Relationship.find({'elementLabel': {$regex: match.child}})
            return res.status(200).send(relationship)
        }
        if(req.query.promote === 'true'){
            relationship = await Relationship.find({
                promoteChild: true
            })
            return res.status(200).send(relationship)
        }
        relationship = await Relationship.find({},null, options)
        if(!relationship){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(relationship)
    } catch (e) {
        console.error(e.message)
        res.status(500).send({'error': e.message})
    }
})


module.exports = router
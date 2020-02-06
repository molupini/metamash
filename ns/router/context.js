const express = require('express')
const router = new express.Router()

// CONTEXT
// const Account = require('../model/context/Account')
const Relationship = require('../model/context/relationship')
const Connector = require('../model/context/connector')

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
                {path: 'relationship'},
            ])
            .execPopulate()
        }
        res.status(200).send({
            connector,
            relationship: connector.relationship
        })
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

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

// TODO MIGHT NOT BE NECESSARY ACCOUNT
// router.post('/context/account/:id', auth, async (req, res) => {
//     try {
//         const account = new Account({
//             owner: req.params.id, 
//             ...req.body
//         })
//         // await account.save()
//         res.status(201).send(account)
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send({error: e.message})
//     }
// })

module.exports = router
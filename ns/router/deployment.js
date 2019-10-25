const express = require('express')
const router = new express.Router()

const Deployments = require('../model/deployment')
const Connector = require('../model/connector')
const Tagging = require('../model/tagging')
const Resources = require('../model/context/resources')
const Tenants = require('../model/context/tenants')

const auth = require('../middleware/auth')
const { logger } = require('../src/util/log')


router.get('/deployment', auth, async (req, res) => {
    try {
        const deployment = await Deployments.find({
        })

        if(!deployment){
            return res.status(404).send({message:'Not Found'})
        }
        // debugging
        // console.log(control)
        res.status(200).send(deployment)
    } catch (e) {
        logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.get('/deployment/:id', async (req, res) => {
    try {
        const deployment = await Deployments.findById(req.params.id)
        if(!deployment){
            return res.status(404).send({message:'Not Found'})
        }

        if(!deployment){
            return res.status(404).send({message:'Not Found'})
        }
        if(!deployment){
            return res.status(404).send({message:'Not Found'})
        }
        if (req.query.populate === 'true') {
            await connector
            .populate([
                {path: 'resources'},
                {path: 'tagging'}
            ])
            .execPopulate()
        }
        res.status(200).send({
            deployment,
            resources: connector.resources,
            tagging: connector.tagging            
        })
    } catch (e) {
        res.status(500).send(e)
    }
})


router.patch('/deployment/:id', async (req, res) => {
    const exclude = ['provider', 'author', '_id', 'stateDescription']
    const isValid = valid(req.body, Deployments.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const deployment = await Deployments.findOne({
            author: req.params.id
        })
        if (!deployment) {
            return res.status(404).send({deployment:'Not Found'})
        }
        // console.log(control)
        const body = Object.keys(req.body)
        body.forEach(value => {
            deployment[value] = req.body[value]
        })
        await deployment.save()
        res.status(201).send(deployment)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})


module.exports = router
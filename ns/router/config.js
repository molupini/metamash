const express = require('express')
const router = new express.Router()
const Abbreviations = require('../model/config/abbreviation')
const Configs = require('../model/config')
const Labels = require('../model/config/labels')
const Tiers = require('../model/context/tiers')
const { valid } = require('../src/util/compare')
const auth = require('../middleware/auth')


// ABBREVIATIONS
router.post('/config/abbreviations', async (req, res) => {
    try {
        const abbreviation = new Abbreviations(req.body)
        await abbreviation.save()
        res.status(201).send(abbreviation)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.post('/config/abbreviations/seedDefaults', async (req, res) => {
    try {
        if(Array.isArray(req.body)){
            const abbr = await Abbreviations.seedArray(req.body)
            if(abbr === 1){
                return res.status(500).send()
            }
        }
        res.status(201).send()
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/config/abbreviations', async (req, res) => {
    try {
        var match = {}
        var options = {}
        var abbreviation = null
        var re = null
        options.limit = 10

        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        if (req.query.key){
            re = RegExp(req.query.key)
            match.keyLabel = re
            abbreviation = await Abbreviations.find({'keyLabel': {$regex: match.keyLabel}})
        }
        if (req.query.element){
            re = RegExp(req.query.element)
            match.elementLabel = re
            abbreviation = await Abbreviations.find({'elementLabel': {$regex: match.elementLabel}})
        }
        if(req.query.keyElements){
            abbreviation = await Abbreviations.find({
                keyLabel: req.query.keyElements
            }).distinct('elementLabel')
            return res.status(200).send(abbreviation)
        }
        if(abbreviation.length === 0){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(abbreviation)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/config/abbreviations/:id', async (req, res) => {
    const exclude = ['_id', 'createdAt', 'updatedAt', '__v']
    const isValid = valid(req.body, Abbreviations.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const abbreviation = await Abbreviations.findById(req.params.id)
        if (!abbreviation) {
            return res.status(404).send({message:'Not Found'})
        }
        // console.log(abbreviation)
        const body = Object.keys(req.body)
        body.forEach(value => {
            abbreviation[value] = req.body[value]
        })
        await abbreviation.save()
        res.status(201).send(abbreviation)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.delete('/config/abbreviations/:id', async (req, res) => {
    try {
        var abbreviation = null
        if(req.query.key){
            abbreviation = await Abbreviations.deleteMany({
                keyLabel: req.query.key
            })
            // console.log(abbreviation)
            if(abbreviation.deletedCount > 0){
                return res.status(200).send()
            }
            return res.status(404).send({message:'Not Found'})
        }
        abbreviation = await Abbreviations.findById(req.params.id)
        if(!abbreviation){
            return res.status(404).send({message:'Not Found'})
        }
        await abbreviation.remove()
        res.status(200).send(abbreviation)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// // TAG DEFAULTS 
router.post('/config/tag/defaults', async (req, res) => {
    try {
        var config = await Configs.countDocuments()
        if(config !== 0){
            return res.status(400).send({message:'Config already present'})
        }
        config = new Configs()
        await config.save()
        res.status(201).send(config)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/config/tag/defaults', async (req, res) => {
    try {
        const config = await Configs.findOne({})
        if(!config){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(config)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/config/tag/defaults', async (req, res) => {
    const exclude = ['_id', 'createdAt', 'updatedAt', '__v']
    const isValid = valid(req.body, Configs.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const config = await Configs.findOne({})
        if (!config) {
            return res.status(404).send({message:'Not Found'})
        }
        // console.log(config)
        const body = Object.keys(req.body)
        body.forEach(value => {
            config[value] = req.body[value]
        })
        await config.save()
        res.status(201).send(config)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.delete('/config/tag/defaults', async (req, res) => {
    try {
        const config = await Configs.deleteOne({})
        if(config.deletedCount === 0){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// TODO MIGHT DEPRECATE WHEN ADDING ABBREVIATIONS
// AUTHOR ID MIGHT DROP AS LABELS ARE ORGANIZATION WIDE 
router.post('/config/label:id', auth, async (req, res) => {
    try {
        const label = new Labels({
            author: req.params.id,
            ...req.body
        })
        await label.save()
        res.status(201).send(label)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/config/label', async (req, res) => {
    try {
        var options = {}
        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        const label = await Labels.find({}, null, options)
        res.status(201).send(label)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/config/label/:id', async (req, res) => {
    try {
        var options = {}
        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        
        const label = await Labels.findById(req.params.id)
        if (req.query.populate === 'true') {
            await label.populate([
                {path: 'tiers'}
            ])
            .execPopulate()
        }
        res.status(201).send({label, tiers: label.tiers})
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/config/label/:id', async (req, res) => {
    if(req.query.tier){
        const tier = await Tiers.findOne({
            author: req.params.id,
            category: req.query.tier
        })
        if (!tier) {
            return res.status(400).send({message:'Please provide a valid tier'})
        }
        const exclude = ['author', '_id', 'category']
        const isValid = valid(req.body, Tiers.schema.obj, exclude)
        if (!isValid) {
            return res.status(400).send({message:'Please provide a valid input'})
        }
        const body = Object.keys(req.body)
        body.forEach(value => {
            tier[value] = req.body[value]
        })
        await tier.save()
        return res.status(201).send(tier)
    }
    const exclude = ['author', '_id']
    const isValid = valid(req.body, Labels.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const labels = await Labels.findOne({
            author: req.params.id,
            resourceType: req.body.resourceType
        })
        if (!labels) {
            return res.status(404).send({labels:'Not Found'})
        }
        // console.log(labels)
        const body = Object.keys(req.body)
        body.forEach(value => {
            labels[value] = req.body[value]
        })
        await labels.save()
        res.status(201).send(labels)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

module.exports = router
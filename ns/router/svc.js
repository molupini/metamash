// ENDPOINT FOR SVC MODELS 
// ABBR, CONF, LABEL
const express = require('express')
const router = new express.Router()
const Abbr = require('../model/svc/abbr')
const Conf = require('../model/svc/conf')
const Label = require('../model/svc/label')
const Name = require('../model/svc/name')

// CONTEXT 
// const Tiers = require('../model/context/tiers')

const { valid } = require('../src/util/compare')
const auth = require('../middleware/auth')


// // ABBR
router.post('/svc/abbr', async (req, res) => {
    try {
        const abbr = await new Abbr(req.body)
        await abbr.save()
        res.status(201).send(abbr)
    } catch (e) {
        console.error(e)
        res.status(500).send(e.message)
    }
})

router.post('/svc/abbr/seed', async (req, res) => {
    try {
        if(Array.isArray(req.body)){
            const abbr = await Abbr.seedArray(req.body)
            if(abbr === 1){
                return res.status(500).send()
            }
        }
        res.status(201).send()
    } catch (e) {
        console.error(e)
        res.status(500).send({'error': e.message})
    }
})

router.get('/svc/abbr', async (req, res) => {
    try {
        var match = {}
        var options = {}
        var abbr = null
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
        if (req.query.key){
            re = RegExp(req.query.key)
            match.keyLabel = re
            abbr = await Abbr.find({'keyLabel': {$regex: match.keyLabel}})
            return res.status(200).send(abbr)
        }
        if (req.query.element){
            re = RegExp(req.query.element)
            // debugging
            // console.log(re)
            match.elementLabel = re
            abbr = await Abbr.find({'elementLabel': {$regex: match.elementLabel}})
            return res.status(200).send(abbr)
        }
        if(req.query.elementEntries){
            abbr = await Abbr.find({
                keyLabel: req.query.elementEntries
            }).distinct('elementLabel')
            return res.status(200).send(abbr)
        }
        if(req.query.keyEntries === 'true'){
            abbr = await Abbr.find({}).distinct('keyLabel')
            return res.status(200).send(abbr)
        }
        abbr = await Abbr.find({},null, options)
        if(!abbr){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(abbr)
    } catch (e) {
        console.error(e.message)
        res.status(500).send({'error': e.message})
    }
})

router.get('/svc/abbr/:id', async (req, res) => {
    try {
        const abbr = await Abbr.findById(req.params.id)
        if(!abbr){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(abbr)
    } catch (e) {
        console.error(e.message)
        res.status(500).send({'error': e.message})
    }
})

router.patch('/svc/abbr/:id', async (req, res) => {
    const exclude = ['_id', 'createdAt', 'updatedAt', '__v']
    const isValid = valid(req.body, Abbr.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const abbr = await Abbr.findById(req.params.id)
        if (!abbr) {
            return res.status(404).send({message:'Not Found'})
        }
        // console.log(abbr)
        const body = Object.keys(req.body)
        body.forEach(value => {
            abbr[value] = req.body[value]
        })
        await abbr.save()
        res.status(201).send(abbr)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.delete('/svc/abbr/:id', async (req, res) => {
    try {
        var abbr = null
        // if(req.query.key){
        //     abbr = await Abbr.deleteMany({
        //         keyLabel: req.query.key
        //     })
        //     // console.log(abbr)
        //     if(abbr.deletedCount > 0){
        //         return res.status(200).send()
        //     }
        //     return res.status(404).send({message:'Not Found'})
        // }
        abbr = await Abbr.findById(req.params.id)
        if(!abbr){
            return res.status(404).send({message:'Not Found'})
        }
        await Abbr.findByIdAndDelete(req.params.id)
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// // CONF 
router.post('/svc/conf', async (req, res) => {
    try {
        const abbr = await Abbr.find({}).distinct('keyLabel')
        if(abbr.length === 0){
            return res.status(400).send({message:'Abbr Missing'})
        }
        var conf = await Conf.countDocuments()
        // if(conf !== 0){
        //     return res.status(400).send({message:'Config already present'})
        // }
        conf = new Conf()
        conf.mandatoryTagKeys = abbr
        await conf.save()
        res.status(201).send(conf)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.get('/svc/conf', async (req, res) => {
    try {
        const conf = await Conf.findOne({})
        if(!conf){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send(conf)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// TODO VERIFY IF REQUIRED 
router.patch('/svc/conf', async (req, res) => {
    const exclude = ['_id', 'createdAt', 'updatedAt', '__v']
    const isValid = valid(req.body, Conf.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const conf = await Conf.findOne({})
        if (!conf) {
            return res.status(404).send({message:'Not Found'})
        }
        if(req.body.mandatoryTagKeys){
            const abbr = await Abbr.find({}).distinct('keyLabel')

        }
        const body = Object.keys(req.body)
        body.forEach(value => {
            conf[value] = req.body[value]
        })
        await conf.save()
        res.status(201).send(conf)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.delete('/svc/conf', async (req, res) => {
    try {
        const conf = await Conf.deleteOne({})
        if(conf.deletedCount === 0){
            return res.status(404).send({message:'Not Found'})
        }
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// // LABEL
// TODO MIGHT DEPRECATE WHEN ADDING ABBR
// TODO AUTHOR ID MIGHT DROP AS LABELS ARE ORGANIZATION WIDE 
router.post('/svc/label/seed', async (req, res) => {
    try {
        var label = []
        if(Array.isArray(req.body)){
            label = await Label.seedArray(req.body)
            if(!label){
                return res.status(500).send({'error': 'Bad Body'})
            }
        }
        res.status(201).send()
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.post('/svc/label', auth, async (req, res) => {
    try {
        // const label = await Label.seedOne(req.body)
        const label = await new Label({...req.body})
        await label.save()
        res.status(201).send(label)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// * NOTE REMOVED PARAM FROM ENDPOINT AS QUERY STRING OFFERS MORE FUNCTION
router.get('/svc/label', async (req, res) => {
    try {
        // ID OR RESOURCE TYPE, WILL NOT REQUIRE OPTIONS
        var options = {}
        var label = null

        if(req.query.id){
            label = await Label.findById(req.params.id)
            // if (req.query.populate === 'true') {
            //     await label.populate([
            //         {path: 'tiers'}
            //     ])
            //     .execPopulate()
            // }
            if(!label){
                return res.status(500).send({'error': 'Label not Found'})
            }
            return res.status(201).send(label)
        }

        if(req.query.resourceType){
            label = await Label.findOne({
                resourceType: req.query.resourceType
            })
            if(!label){
                return res.status(500).send({'error': 'Label not Found'})
            }
            return res.status(201).send(label)
        }

        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        if (parseInt(req.query.skip) > 1){
            options.skip = parseInt(req.query.skip) 
        }
        label = await Label.find({}, null, options)
        res.status(200).send(label)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

router.patch('/svc/label', async (req, res) => {
    const exclude = ['author', '_id']
    const isValid = valid(req.body, Label.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Bad Body'})
    }
    try {
        const label = await Label.findOne({
            resourceType: req.body.resourceType
        })
        if (!label) {
            return res.status(404).send({label:'Not Found'})
        }
        // console.log(label)
        const body = Object.keys(req.body)
        body.forEach(value => {
            label[value] = req.body[value]
        })
        await label.save()
        res.status(201).send(label)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send({error: e.message})
    }
})

// NAME
router.get('/svc/name', async (req, res) => {
    try{
        var options = {}
        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        if (parseInt(req.query.skip) > 1){
            options.skip = parseInt(req.query.skip) 
        }
        const name = await Name.find({}, null, options)
        res.status(200).send(name)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send({error: e.message})
    }
})

router.delete('/svc/name:id', async (req, res) => {
    try{
        const name = await Name.findByIdAndDelete(req.params.id)
        if (!name) {
            return res.status(400).send({message:'Name not Found'})
        }
        res.status(200).send()
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send({error: e.message})
    }
})

module.exports = router
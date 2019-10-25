const express = require('express')
const router = new express.Router()

// custom models
const Environments = require('../model/context/environments')
const Locations = require('../model/context/locations')
const Networks = require('../model/context/networks')
const Resources = require('../model/context/resources')
const Tenants = require('../model/context/tenants')
const Tiers = require('../model/context/tiers')
const Perimeter = require('../model/context/perimeter')

// const OrganizationalUnit = require('../model/context/ou')
// const MiscConfig = require('../model/misc')

// custom methods
const { valid } = require('../src/util/compare')
const { logger } = require('../src/util/log')
const auth = require('../middleware/auth')


router.post('/context/:id', auth, async (req, res) => {
    try {
        if(req.query.config === 'tenants'){
            const tenants = await new Tenants({
                author: req.params.id, 
                ...req.body
            })
            // console.log(template)
            await tenants.save()
            return res.status(201).send(tenants)    
        }
        if(req.query.config === 'networks'){
            const networks = await new Networks({
                author: req.params.id, 
                ...req.body
            })
            // console.log(template)
            await networks.save()
            return res.status(201).send(networks)
        }
        if(req.query.config === 'resources'){
            const resources = await new Resources({
                author: req.params.id, 
                owner: req.params.id,
                ...req.body
            })
            // console.log(template)
            await resources.save()
            return res.status(201).send(resources)    
        }
        res.status(400).send({message:'Please provide a valid config'})
    } catch (e) {
        logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// patch provider, with validation and key exclusion
// findByIdAndUpdate() will bypass the middleware which is what we require when posting the changes below
// parse body for allowed fields 
router.patch('/context/:id', auth, async (req, res) => {
    try {
        if(req.query.config === 'environments'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Environments.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const environment = await Environments.findOne({
                author: req.params.id
            })
            if (!environment) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                environment[value] = req.body[value]
            })
            await environment.save()
            return res.status(201).send(environment)
        }
        if(req.query.config === 'locations'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Locations.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const location = await Locations.findOne({
                author: req.params.id,
                primary: req.body.primary
            })
            if (!location) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                location[value] = req.body[value]
            })
            await location.save()
            return res.status(201).send(location)
        }
        if(req.query.config === 'networks'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Networks.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const network = await Networks.findOne({
                author: req.params.id,
                network: req.body.network
            })
            if (!network) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                network[value] = req.body[value]
            })
            await network.save()
            return res.status(201).send(network)
        }
        if(req.query.config === 'resources'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Resources.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const resource = await Resources.findOne({
                author: req.params.id,
                logicalName: req.body.logicalName
            })
            if (!resource) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                resource[value] = req.body[value]
            })
            await resource.save()
            return res.status(201).send(resource)
        }
        if(req.query.config === 'tenants'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Tenants.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const tenants = await Tenants.findOne({
                author: req.params.id,
                cluster: req.query.cluster,
                businessEntity: req.query.businessEntity
            })
            if (!tenants) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                tenants[value] = req.body[value]
            })
            await tenants.save()

            // TODO MUST TO IMPLEMENT CHANGE OF LABELS ACROSS SCHEMAS 
            // MIGHT NEED TO REMOVE FUNCTIONALITY 
            // const ou = await OrganizationalUnit.find({
            //     author: tenants._id
            // })

            // const misc = await MiscConfig.findOne({
            //     author: tenants._id
            // })

            // if(ou && misc){
            //     for (let i = 0; i < ou.length; i++){
            //         var array = ou[i].account.split(misc.stringDelimiter)

            //     }
            // }

            return res.status(201).send(tenants)
        }
        // if(req.query.config === 'tiers'){
        //     const exclude = ['author', '_id']
        //     const isValid = valid(req.body, Tiers.schema.obj, exclude)
        //     if (!isValid) {
        //         return res.status(400).send({message:'Please provide a valid input'})
        //     }
        //     const tier = await Tiers.findOne({
        //         author: req.params.id,
        //         tier: req.body.tier
        //     })
        //     if (!tier) {
        //         return res.status(404).send({message:'Not Found'})
        //     }
        //     const body = Object.keys(req.body)
        //     body.forEach(value => {
        //         tier[value] = req.body[value]
        //     })
        //     await tier.save()
        //     return res.status(201).send(tier)
        // }
        if(req.query.config === 'perimeters'){
            const exclude = ['author', '_id']
            const isValid = valid(req.body, Perimeter.schema.obj, exclude)
            if (!isValid) {
                return res.status(400).send({message:'Please provide a valid input'})
            }
            const perimeter = await Perimeter.findOne({
                author: req.params.id
            })
            if (!perimeter) {
                return res.status(404).send({message:'Not Found'})
            }
            const body = Object.keys(req.body)
            body.forEach(value => {
                perimeter[value] = req.body[value]
            })
            await perimeter.save()
            return res.status(201).send(perimeter)
        }
        res.status(400).send({message:'Please provide a valid config'})
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

// misc config
// moved to standalone endpoint
// router.patch('/context/misc/:id', async (req, res) => {
//     try {
//         const exclude = ['author', '_id']
//         const isValid = valid(req.body, MiscConfig.schema.obj, exclude)
//         if (!isValid) {
//             return res.status(400).send({message:'Please provide a valid input'})
//         }
//         const misc = await MiscConfig.findOne({
//             author: req.params.id
//         })

//         if (!misc) {
//             return res.status(404).send({message:'Not Found'})
//         }

//         // console.log(misc)
        
//         const body = Object.keys(req.body)
//         body.forEach(value => {
//             misc[value] = req.body[value]
//         })
        
//         await misc.save()

//         if(req.query.seedOuAccount === 'group'){
//             if(misc.masterEnabled){
//                 const connector = await MainConnector.findById(misc.author)
//                 // console.log(connector)
//                 console.log(`${connector.groupOrganization} ${connector.provider} ${misc.masterLabel}`)
//             }
            
//             // const ou = await new OrganizationalUnit({
//             //     author = connector.id
//             // })
//         }
        
//         return res.status(201).send(misc)
//     } catch (e) {
//         res.status(500).send({error: e.message})
//     }
// })


module.exports = router
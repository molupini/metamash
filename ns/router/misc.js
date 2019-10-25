const express = require('express')
const router = new express.Router()

// custom models
const OrganizationalUnit = require('../model/context/ou')
const Tenants = require('../model/context/tenants')
const Environments = require('../model/context/environments')
const MainConnector = require('../model/connector')
const MiscConfig = require('../model/misc')

// custom methods
const { valid, rightKey, setValues } = require('../src/util/compare')
const { logger } = require('../src/util/log')
const auth = require('../middleware/auth')


// router.post('/misc/:id', async (req, res) => {
//     try {
//         const misc = await new MiscConfig({
//             owner: req.params.id,
//             ...req.body
//         })
//         // console.log(template)
//         await misc.save()
//         return res.status(201).send(misc)    
//     } catch (e) {
//         logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

router.get('/misc', async (req, res) => {
    try {
        var misc = null
        var match = {}
        if(req.query.owner){
            match.owner = req.query.owner
        }
        if(req.query.author){
            match.author = req.query.author
        }
        misc = await MiscConfig.find(match, null)
        // console.log(template)
        if(!misc){
            return res.status(404).send({message:'Not Found'})
        }
        // await misc.save()
        return res.status(200).send(misc)    
    } catch (e) {
        logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// patch provider, with validation and key exclusion
// findByIdAndUpdate() will bypass the middleware which is what we require when posting the changes below
// parse body for allowed fields 
router.patch('/misc/:id', async (req, res) => {
    try {
        const exclude = ['author', 'owner', '_id', 'masterEnabled', 'loggingEnabled', 'auditEnabled', 'billingEnabled', 'networkEnabled', 'sharedInfrastructureEnabled', 'sharedApplicationsEnabled']
        const isValid = valid(req.body, MiscConfig.schema.obj, exclude)
        if (!isValid) {
            return res.status(400).send({message:'Please provide a valid input'})
        }
        const misc = await MiscConfig.findOne({
            _id: req.params.id
        })

        if (!misc) {
            return res.status(404).send({message:'Not Found'})
        }
        
        const body = Object.keys(req.body)
        body.forEach(value => {
            misc[value] = req.body[value]
        })
        
        await misc.save()

        return res.status(201).send(misc)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.post('/misc/:id/groupAccounts', async (req, res) => {
    try {
        const filter = {author: req.params.id}
        var enabled = {}
        if(req.query.enable){
            const keys = rightKey(req.query.enable, MiscConfig.schema.obj, 'Enabled')
            // console.log(keys)
            enabled[keys] = true
        }
        const misc = await MiscConfig.findOne(filter)
        if (!misc) {
            return res.status(404).send({message:'Not Found'})
        }
        // console.log(misc.owner.toString() !== misc.author.toString())
        if (misc.owner.toString() !== misc.author.toString()) {
            return res.status(404).send({message:'Not group account'})
        }
        const config = await MiscConfig.updateOne(filter, enabled)
        // console.log(config)
        if(config.nModified > 0){
            const connector = await MainConnector.findById(misc.author)
            if(!connector){
                return res.status(404).send({message:'Not Found'})
            }
            const keys = rightKey(req.query.enable, MiscConfig.schema.obj, 'Label')
            // console.log(keys)
            const miscLabel = misc[keys]
            // console.log(miscLabel)
            if(miscLabel){
                const accountName = await OrganizationalUnit.accountName(connector.groupOrganization, misc.stringDelimiter, connector.provider, miscLabel)
                // console.log(accountName)
                const ou = await new OrganizationalUnit({
                    owner: misc.owner, 
                    author: misc.author,
                    account: accountName
                })
                // console.log(ou)
                await ou.save()
            }
        }
        res.status(201).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.post('/misc/:id/tenantAccounts', auth, async (req, res) => {
    try {
        const filter = {author: req.params.id}
        // console.log(filter)
        const misc = await MiscConfig.findOne(filter)
        if (!misc) {
            return res.status(404).send({message:'Not Found'})
        }
        if (misc.owner.toString() === misc.author.toString()) {
            return res.status(404).send({message:'Not tenant account'})
        }
        const config = await MiscConfig.updateOne(filter, {
            sharedApplicationsEnabled: true
        })
        // console.log(config)
        const environments = await Environments.findOne({
            author: misc.owner
        })

        // config.nModified > 0
        if(config.nModified > 0){
            const connector = await MainConnector.findById(misc.owner)
            const tenant = await Tenants.findOne({
                _id: req.params.id
            })
            if(!connector){
                return res.status(404).send({message:'Connector not Found'})
            }
            if(!tenant){
                return res.status(404).send({message:'Tenant not Found'})
            }
            if(!environments){
                return res.status(404).send({message:'Environment not Found'})
            }
            // console.log(connector, tenant, environments)
            const keys = rightKey('sharedApplications', MiscConfig.schema.obj, 'Label')
            // console.log(keys)
            const miscLabel = misc[keys]
            // console.log(miscLabel)
            if(miscLabel){
                const accountName = await OrganizationalUnit.accountName(tenant.businessEntity, misc.stringDelimiter, tenant.cluster, miscLabel)
                const ou = await new OrganizationalUnit({
                    owner: misc.owner, 
                    author: misc.author,
                    account: accountName
                })
                // console.log(ou)
                const exclude = ['author', 'owner', '_id', 'other', 'v']
                const setArray = await setValues(environments.schema.obj, environments, exclude)
                // console.log(setArray)
                // console.log(set)
                await ou.seedEnvironmentAccount(connector.id, tenant.id, tenant.businessEntity, tenant.cluster, misc.stringDelimiter, setArray)
                await ou.save()
            }
        }
        res.status(201).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.post('/misc/:id/projectAccounts', auth, async (req, res) => {
    try {
        const filter = {author: req.params.id}
        // console.log(filter)
        const misc = await MiscConfig.findOne(filter)
        if (!misc) {
            return res.status(404).send({message:'Not Found'})
        }
        if (misc.owner.toString() === misc.author.toString()) {
            return res.status(404).send({message:'Not tenant account'})
        }
        const config = await MiscConfig.updateOne(filter, {
            projectEnabled: true
        })
        // config.nModified > 0
        if(config){
            const connector = await MainConnector.findById(misc.owner)
            const tenant = await Tenants.findOne({
                _id: req.params.id
            })
            if(!connector){
                return res.status(404).send({message:'Connector not Found'})
            }
            if(!tenant){
                return res.status(404).send({message:'Tenant not Found'})
            }
            const keys = rightKey('project', MiscConfig.schema.obj, 'Label')
            const miscLabel = misc[keys]
            var name = await OrganizationalUnit.projectName(tenant.businessEntity, misc.stringDelimiter, null, miscLabel)
            name = Array.isArray(name) === true ? name.join('') : name
            // console.log(name)
            const ou = await new OrganizationalUnit({
                account: name,
                author: tenant.id,
                owner: connector.id
            })
            await ou.save()
        }
        res.status(201).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})


module.exports = router
const express = require('express')
const router = new express.Router()

// CONTEXT 
const Resources = require('../model/context/resources')
const Names = require('../model/config/names')
const Labels = require('../model/config/labels')
const SecurityRules = require('../model/config/security')
const Deployments = require('../model/deployment')
const Tagging = require('../model/tagging')
const Perimeters = require('../model/context/perimeter')
const OrganizationalUnit = require('../model/context/ou')
const MainConnector = require('../model/connector')
// const MiscConfig = require('../model/misc')

// UTILS 
const { bodyQuery, objDocBuilder, tagBuilder, logicalNameBuilder } = require('../src/util/names')
const auth = require('../middleware/auth')
const { discover } = require('../connect/bin/aws')
const { valid } = require('../src/util/compare')

// TODO MIGHT BE A ISSUE THAT PROVIDER WILL EFFECT ACCOUNTS AS ACCOUNTS CAN HAVE A 1:MANY RELATIONSHIP WITH PROVIDERS
// FIX LABELLING ERROR HANDLE, logicalNameBuilder
// NEED TO MOVE SECTIONS INTO INNER FUNCTIONS
    // objectDocument - this will find all elements and 
// NEED TO CREATE A QUICK STATE CREATE ENDPOINT WITH A HTTP REQ FUNCTION 
// TODO EVALUATE POPULATE RATHER
router.post('/resources/create', auth, async (req, res) => {
    try {
        // // USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT 
        var object = bodyQuery(req.body, req.query)
        // debugging
        // console.log('bodyQuery object =')
        // console.log(object)

        // // USED TO COMBINE OBJECT AND FOUND "MONGO" DOCUMENTS "WITH MANDATORY MODELS" AND RETURN A SINGLE OBJECT 
        object = await objDocBuilder(object)
        // console.log('objDocBuilder object =')
        // console.log(object)

        // ERROR IN CALLING FUNCTION
        if(object.name){
            return res.status(404).send({message: object.message})
        }

        // // TAG BUILDER WILL COMPARE CURRENT OBJECT AND RETURN TAG AND CONFIG FOR THIS RESOURCE
        // // RESOURCE ELEMENT AND CONFIG ELEMENT VERIFICATION "IF ANY MISSING ELEMENTS" PERFORMED
        // // IF THE ELEMENT IS REQUIRED IN BOTH TAG AND CONFIGURATION IT MUST BE DECLARED IN BOTH, SEE LABEL
        // // TODO NEED TO CONFIRM THAT IF STRING FOR TAG IS NOT DEFINED IN ABBREVIATION THAT A ERROR IS THROWN
        // // > RATHER PERFORM ABOVE WHEN SEEDING, INSERTING ABBREVIATIONS 
        var builder = await tagBuilder(object)
        // ERROR IN CALLING FUNCTION
        if(builder.name){
            // throw new Error(builder.message)
            return res.status(404).send({message: builder.message})
        }
        // console.log('tagBuilder object =')
        // console.log(builder)

        // // COMPARE OBJECT WITH LABEL AND RETURN SCHEMA
        // // RETURN LOGICAL NAME 
        // // TODO FIX ERROR HANDLING LIKE ABOVE TAG BUILDER
        logicalName = await logicalNameBuilder(builder.tag)
        if(logicalName.name){
            return res.status(404).send({message: logicalName.message})
        }
        // debugging
        // console.log('logicalNameBuilder logicalName =')
        // console.log(logicalName)

        if(!object.cart){
            deployment = new Deployments({
                author: object.accountId,
                state: object.nameOnly === true ? 13 : 0
            })
            object.deploymentId = deployment._id
            builder.tag.deploymentId = object.deploymentId
            await deployment.save()
        }


        // TODO DEPRECATE COUNT AS WILL NOT BE NECESSARY WITH ASG
        // IF CALLER/USER WANTS MORE ITEMS WILL NEED TO ITERATE
        // COMMENT BLOCK BELOW IS IN REVIEW, SEE # FOR CURRENT SOLUTION

        // #
        // // SEED RESOURCE
        resource = await new Resources({
            author: object.deploymentId,
            owner: object.accountId,
            resourceType: builder.tag.resourceType,
            logicalName: logicalName,
            userDefined: true,
            misc: builder.configuration
        })
        await resource.save()

        // // SEED NAME
        const name = await new Names({
            author: resource._id, 
            fullName: logicalName
        })
        await name.save()
        // #

        /*
        // COUNT PARAMETER GREATER THEN 1
        const numerator = builder.configuration.count
        var resource = null
        var ln = []

        if(numerator > 1){
            
            var num = 0
            var iteration = 0
            var re = null
            for (let i = 0; i < numerator; i++){
                // console.log('i =', i)
                re = new RegExp(/\d{1,10}$/)
                const mesh = logicalName.match(re)
                iteration = parseInt(mesh[0])
                iteration+=num
                // console.log('count iteration =', iteration)
                const len = iteration.toString().split('').length
                var string = `\\d{1,${len}}$`
                re = new RegExp(string)

                // // SEED RESOURCE
                builder.configuration.count = 1
                resource = await new Resources({
                    author: object.deploymentId,
                    owner: object.accountId,
                    resourceType: builder.tag.resourceType,
                    logicalName: logicalName.replace(re, iteration),
                    userDefined: true,
                    misc: builder.configuration
                })
                await resource.save()

                // // SEED NAME
                const name = await new Names({
                    author: resource._id, 
                    fullName: logicalName.replace(re, iteration)
                })
                await name.save()
                ln.push(name.fullName)
                num++
            }
            
        }else{
            // // SEED RESOURCE
            resource = await new Resources({
                author: object.deploymentId,
                owner: object.accountId,
                resourceType: builder.tag.resourceType,
                logicalName: logicalName,
                userDefined: true,
                misc: builder.configuration
            })
            await resource.save()

            // // SEED NAME
            const name = await new Names({
                author: resource._id, 
                fullName: logicalName
            })
            await name.save()
            ln.push(name.fullName)
        }
        // console.log(ln)
        */
        
        // // SEED TAGS 
        // // USING EXISTING DEPLOYMENT/CART FOR RESOURCE TO GROUP RESOURCES
        var tagging = null
        if(object.cart){
            tagging = await Tagging.find({
                author: object.deploymentId
            })
        }else{
            tagging = await new Tagging({
                author: object.deploymentId,
                entries: builder.tag
            })
            // // SAVE COMMON DOCUMENTS 
            await tagging.save()
        }

        res.status(201).send({deploymentId:object.deploymentId})
    } catch (e) {
        res.status(500).send(e)
    }
})

// TODO EVAL IF SINGLE CREATE REQUIRED AS MULTI WILL CARTER FOR BOTH REQUESTS
router.post('/resources/create/multiple', auth, async (req, res) => {
    try {
        // // USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT
        // IF COUNT, SET 1 AS RESOURCE TYPE WILL SET THE COUNT PARAMETER
        if(req.query.count){
            req.query.count = 1
        }
        var object = bodyQuery(req.body, req.query)
        // debugging
        // console.log('bodyQuery object =')
        // console.log(object)

        var array = Array.isArray(object.resourceType) ? object.resourceType : [object.resourceType]
        if (array.includes('STATE')){
            array = ['STATE', 'RGRP', 'AGRP', 'S3', 'AUSR', 'RUSR', 'DYN']
        }
        for (let i = 0; i < array.length; i++){
            var dolly = Object.assign({}, object)
            dolly.resourceType = array[i]

            // // USED TO COMBINE OBJECT AND FOUND "MONGO" DOCUMENTS "WITH MANDATORY MODELS" AND RETURN A SINGLE OBJECT 
            dolly = await objDocBuilder(dolly)
            // console.log('objDocBuilder dolly =')
            // console.log(dolly)

            // ERROR IN CALLING FUNCTION
            if(dolly.name){
                return res.status(404).send({message: dolly.message})
            }

            // // TAG BUILDER WILL COMPARE CURRENT OBJECT AND RETURN TAG AND CONFIG FOR THIS RESOURCE
            // // RESOURCE ELEMENT AND CONFIG ELEMENT VERIFICATION "IF ANY MISSING ELEMENTS" PERFORMED
            // // IF THE ELEMENT IS REQUIRED IN BOTH TAG AND CONFIGURATION IT MUST BE DECLARED IN BOTH, SEE LABEL
            // // TODO NEED TO CONFIRM THAT IF STRING FOR TAG IS NOT DEFINED IN ABBREVIATION THAT A ERROR IS THROWN
            // // > RATHER PERFORM ABOVE WHEN SEEDING, INSERTING ABBREVIATIONS 
            var builder = await tagBuilder(dolly)
            // ERROR IN CALLING FUNCTION, 
            if(builder.name){
                return res.status(404), ({message: builder.message})
            }object
            // console.log('tagBuilder builder =')
            // console.log(builder)

            // // COMPARE OBJECT WITH LABEL AND RETURN SCHEMA
            // // RETURN LOGICAL NAME 
            // // TODO FIX ERROR HANDLING LIKE ABOVE TAG BUILDER
            logicalName = await logicalNameBuilder(builder.tag)
            if(logicalName.name){
                return res.status(404).send({message: logicalName.message})
            }
            // debugging
            // console.log('logicalNameBuilder logicalName =')
            // console.log(logicalName)

            if(!dolly.cart){
                deployment = new Deployments({
                    author: dolly.accountId,
                    state: dolly.nameOnly === true ? 13 : 0
                })
                // UPDATING CLONED OBJECT 
                object.deploymentId = deployment._id
                builder.tag.deploymentId = object.deploymentId
                object.cart = object.cart !== true ? true : false
                await deployment.save()
            }
            // debugging
            // console.log('deployment =')
            // console.log(deployment)

            // // SEED RESOURCE
            const resource = await new Resources({
                author: object.deploymentId,
                owner: dolly.accountId,
                resourceType: builder.tag.resourceType,
                logicalName: logicalName,
                userDefined: true, 
                misc: builder.configuration
            })
            await resource.save()
            // debugging
            // console.log('resource =')
            // console.log(resource)

            // // SEED NAME
            const name = await new Names({
                author: resource._id, 
                fullName: logicalName
            })
            await name.save()
            // debugging
            // console.log('name =')
            // console.log(name)
            
            // // SEED TAGS 
            // // USING EXISTING DEPLOYMENT/CART FOR RESOURCE TO GROUP RESOURCES
            var tagging = null
            if(dolly.cart){
                tagging = await Tagging.find({
                    author: object.deploymentId
                })
            }else{
                tagging = await new Tagging({
                    author: object.deploymentId,
                    entries: builder.tag
                })
                // // SAVE COMMON DOCUMENTS 
                await tagging.save()
            }
            // debugging
            // console.log('tagging =')
            // console.log(tagging)
        }

        await res.status(201).send({deploymentId:object.deploymentId})
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/resources/deployments', auth, async (req, res) => {
    try {
        var Options = {}
        Options.limit = parseInt(req.query.limit) >= 50 ? parseInt(req.query.limit) : 50
        Options.skip = req.query.skip ? req.query.skip : 0
        const deployment = await Deployments.find({}, null, Options)
        res.status(200).send(deployment)
    } catch (e) {
        res.status(500).send(e)
    }
})

// TODO JUST EVAL/TESTING IF NECESSARY AS HANDLED IN MAIN CONNECTOR MODEL
router.get('/resources/discovery/:id', async (req, res) => {
    try {
        const connector = await MainConnector.findById(req.params.id)
        if(!connector){
            return res.status(404).send({message:'Connector not found'})
        }
        if(connector.provider === 'AWS'){
            await discover(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_KEY, connector)

        }
        res.status(200).send()
    } catch (e) {
        res.status(500).send(e)
    }
})

// USED BY SERVICE TO UPDATE LOGICAL ID'S 
router.patch('/resources/update/:id', auth, async (req, res) => {
    const exclude = ['author', 'owner', '_id', 'misc']
    const isValid = valid(req.body, Resources.schema.obj, exclude)
    if (!isValid) {
        return res.status(400).send({message:'Please provide a valid input'})
    }
    try {
        const resource = await Resources.findById(req.params.id)
        if (!resource) {
            return res.status(404).send({message:'Not Found'})
        }
        // console.log(resource)
        const body = Object.keys(req.body)
        body.forEach(value => {
            resource[value] = req.body[value]
        })
        await resource.save()
        res.status(201).send(resource)
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

router.post('/resources/add/rule/:id', auth, async (req, res) => {
    try {
        // TODO NEED TO PROVIDE A ENDPOINT TO DELETE RULES 
        // await SecurityRules.deleteMany({
        // })
        var group = await Resources.find({
            author: req.params.id,
            resourceType: 'SGRP'
        })
        group = group.filter((x) => {
            return x.misc.forResource === req.body.forResource
        })
        // debugging
        // console.log('group =')
        // console.log(group)
        if(!group){
            return res.status(404).send({message:'Group not Found'})
        }
        const resource = await Resources.findOne({
            author: req.params.id,
            resourceType: req.body.forResource
        })
        // console.log('resource =')
        // console.log(resource)
        if(!resource){
            return res.status(404).send({message:'Resource not Found'})
        }
  
        const securityRule = await SecurityRules.find({
            owner: req.params.id,
            ...req.body
        })
        // debugging
        // console.log('securityRule =')
        // console.log(securityRule)
        if(securityRule.length !== 0){
            return res.status(404).send({message:'Rule Found'})
        }
        if(group.length >= 1){
            group = group[0]
        }
        const rule = new SecurityRules({
            author: group._id,
            owner: req.params.id, 
            ...req.body
        })
        await rule.save()
        res.status(201).send(rule)
    } catch (e) {
        res.status(500).send({error: e.message})   
    }
})

router.get('/resources/query/:id', auth, async (req, res) => {
    try {
        var object = {}
        var resourceType = null

        const deployment = await Deployments.findById(req.params.id)
        if(!deployment){
            return res.status(404).send({message:'Deployment not found'})
        }
        const account = await OrganizationalUnit.findById(deployment.author)
        if(!account){
            return res.status(404).send({message:'Account not found'})
        }
        const tagging = await Tagging.findOne({
            author: deployment._id
        })
        var resources = await Resources.find({
            author: deployment._id
        })
        const connector = await MainConnector.findOne({
            _id: account.owner
        })
        // console.log(connector)
        if(!resources){
            return res.status(404).send({message:'Resources not found'})
        }
        if(resources.length > 1){
            resourceType = await Resources.find({
                author: deployment._id
            }).distinct('resourceType')
            if(resourceType.length > 1){
                tagging.entries.resourceType = resourceType.join('-')
                await tagging.save()
            }        
        }
        if(req.query.document === 'resources'){
            // console.log(resources)
            if (resources.length > 0){
                for (let i = 0; i < resources.length; i++){
                    if (resources[i]['resourceType'] !== 'SGRP'){
                        // console.log(resources[i])
                        var inner = {}
                        const key = resources[i]['resourceType']
                        inner['logicalName'] = resources[i]['logicalName']
                        inner['resourceId'] = resources[i]['id']
                        if (resources[i]['logicalId'] !== 'NULL'){
                            inner['logicalId'] = resources[i]['logicalId']
                        }
                        inner['resourceType'] = resources[i]['resourceType']
                        if (resources[i]['misc'] !== undefined){
                            Object.keys(resources[i]['misc']).forEach((x) => {
                                const val = resources[i]['misc'][x]
                                inner[x] =  val !== typeof String ? val.toString() : val
                            })
                        }
                        if(object[key] !== undefined){
                            Object.keys(object[key]).forEach(element => {
                                if(element === 'count'){
                                    const num = parseInt(object[key][element]) + parseInt(inner[element])
                                    object[key][element] = num.toString()
                                }
                                else if (element.match(/(logicalName|logicalId|resourceId)/)){
                                    object[key][element] = object[key][element].concat(';', inner[element])
                                }
                                // EBS SPECIFICALLY 
                                else if (element.match(/(path|size)/) && object[key][element] !== "NULL"){
                                    object[key][element] = object[key][element].concat(';', inner[element])
                                }
                                // SECURITY GROUP SPECIFICALLY
                                else if (element.match(/(port|direction|source)/) && object[key][element] !== "NULL"){
                                    object[key][element] = object[key][element].concat(';', inner[element])
                                }
                            })
                        } 
                        else {
                            object[key] = inner
                        }
                        // console.log(object.keys(key))
                    }
                }
            }
            return res.status(200).send({resources: object})
        }
        if(req.query.document === 'resourceArray'){
            // console.log(resources)
            if (resources.length > 0){
                for (let i = 0; i < resources.length; i++){
                    if (resources[i]['resourceType'] !== 'SGRP'){
                        // console.log(resources[i])
                        var inner = {}
                        const key = resources[i]['resourceType']
                        inner['logicalName'] = resources[i]['logicalName']
                        inner['resourceId'] = resources[i]['id']
                        if (resources[i]['logicalId'] !== 'NULL'){
                            inner['logicalId'] = resources[i]['logicalId']
                        }
                        inner['resourceType'] = resources[i]['resourceType']
                        if (resources[i]['misc'] !== undefined){
                            Object.keys(resources[i]['misc']).forEach((x) => {
                                const val = resources[i]['misc'][x]
                                inner[x] =  val !== typeof String ? val.toString() : val
                            })
                        }
                        if(object[key] !== undefined){
                            object[key].push(inner)
                        } 
                        else {
                            object[key] = [inner]
                        }
                        // console.log(object.keys(key))
                    }
                }
            }
            return res.status(200).send({resources: object})
        }
        if(req.query.document === 'security'){
            var ruleObject = {}
            var resourceObject = {}
            if (resources.length > 0){
                resources = resources.filter((x) => {
                    // console.log(x.resourceType === 'SGRP')
                    return x.resourceType === 'SGRP'
                })
                // debugging
                // console.log('resources =')
                // console.log(resources)
                // console.log('count =', resources.length)
                // console.log()
                for (let i = 0; i < resources.length; i++){
                    const rule = await SecurityRules.find({
                        author: resources[i].id
                    })
                    // debugging
                    // console.log(`rule for, ${resources[i].id} = `)
                    // console.log(rule)
                    // console.log('count =', rule.length)
                    // console.log()
                    if (rule.length > 0){
                        for (let x = 0; x < rule.length; x++){
                            // SECURITY GROUP RESOURCE
                            var resource = {
                                logicalName: resources[i]['logicalName'],
                                resourceType: resources[i]['resourceType'],
                                logicalId: resources[i]['logicalId'],
                                resourceId: resources[i]['_id']
                                // ,
                                // toResource: resources[i].misc['toResource']
                            }
                            const rkey = resources[i].misc['forResource']
                            if(resourceObject[rkey] === undefined){
                                resourceObject[rkey] = resource
                            }
                            // RULES
                            var secure = {
                                port: rule[x]['port'], 
                                source: rule[x]['source'],
                                direction: rule[x]['direction'],
                                forResource: rule[x]['forResource'], 
                                toResource: rule[x]['toResource']
                            }
                            const skey = rule[x]['forResource']
                            if(ruleObject[skey] === undefined){
                                ruleObject[skey] = [secure]
                            }
                            else {
                                ruleObject[skey].push(secure)
                            }
                            // debugging
                            // console.log('resource =')
                            // console.log(resource)
                            // console.log('secure =')
                            // console.log(secure)
                        }
                    }
                }
            }
            // TODO TESTING WITH SECURITY GROUP SPECIFIC SOURCE BASED ON TO RESOURCE
            // console.log('resourceObject =')
            // console.log(resourceObject)
            return res.status(200).send({
                resources: resourceObject,
                rules: ruleObject
            })
        }
        if(req.query.document === 'connector'){
            return res.status(200).send({connector: connector})
        }
        // DISCOVERY IS USED FOR FINDING RESOURCES THAT ARE DEPLOYED POST, API AND NOT USER DEFINED
        if(req.query.document === 'discovery'){
            const discovery = await Resources.find({
                owner: account.owner,
                author: account.owner,
                userDefined: false
            })
            // console.log(discovery)
            if (discovery.length > 0){
                for (let i = 0; i < discovery.length; i++){
                    var inner = {}
                    var found = false
                    const key = discovery[i]['resourceType']
                    inner['logicalName'] = discovery[i]['logicalName']
                    inner['logicalId'] = discovery[i]['logicalId']
                    // TODO EVAL THE BELOW MATCH MIGHT BE TO SPECIFIC
                    const re = new RegExp(account.account, 'i')
                    found = inner['logicalName'].match(re)
                    if (found && discovery[i]['misc'] !== undefined){
                        Object.keys(discovery[i]['misc']).forEach((x) => {
                            inner[x] = discovery[i]['misc'][x]
                        })
                    }
                    object[key] = found ? inner : null
                }
            }
            return res.status(200).send({resources: object})
        }
        // PARENT RESOURCES, WILL FIND RESOURCES THAT ARE CREATED FOR THIS SPECIFIC "OWNER =" ACCOUNT 
        if(req.query.document === 'parent'){
            var parent = await Resources.find({
                owner: account._id,
                userDefined: true
            })
            parent = parent.filter ((x) => {
                return x.logicalId !== 'NULL'
            })
            if (parent.length > 0){
                for (let i = 0; i < parent.length; i++){
                    var inner = {}
                    var found = false
                    const key = parent[i]['resourceType']
                    const label = await Labels.findOne({
                        resourceType: key
                    })
                    const accountCase = label.isUpperCase ? account.account.toUpperCase() : account.account.toLowerCase()
                    inner['logicalName'] = parent[i]['logicalName']
                    inner['logicalId'] = parent[i]['logicalId']
                    // TODO EVAL THE BELOW MATCH MIGHT BE TO SPECIFIC 
                    found = inner['logicalName'].match(accountCase)
                    if (found && parent[i]['misc'] !== undefined){
                        Object.keys(parent[i]['misc']).forEach((x) => {
                            inner[x] = parent[i]['misc'][x]
                        })
                    }
                    object[key] = found ? inner : null
                }
            }
            return res.status(200).send({resources: object})
        }
        if(req.query.document === 'tagging'){
            return res.status(200).send({tagging: tagging['entries']})
        }
        if(req.query.document === 'deployment'){
            return res.status(200).send({deployment: deployment})
        }
        if(req.query.document === 'account'){
            return res.status(200).send({account: account})
        }
        if(req.query.document === 'perimeter'){
            const perimeter = await Perimeters.findOne({
                author: connector.id
            })
            if(!perimeter){
                return res.status(404).send({message:'Perimeters not found'})
            }
            object['public'] = perimeter['perimeterLabel']
            object['private'] = perimeter['backOfficeLabel']
            object['internet'] = perimeter['breakoutLabel']
            object['default'] = '*'
            return res.status(200).send({perimeter: object})
        }
        if(req.query.document === 'state'){
            if(!account.remoteStateReadyEnabled){
                return res.status(500).send({message:'Bad state, Repair'})
            }
            const state = await Resources.find({
                author: account.remoteStateDeploymentId
            })
            if(!state){
                return res.status(404).send({message:'State not found'})
            }
            var result = {}
            state.filter ((x) => {
                // console.log(x)
                if (x.resourceType === 'DYN' || x.resourceType === 'S3') {
                    result[x.resourceType] = x.logicalName
                }
            })
            // console.log(result)
            return res.status(200).send(result)
        }
        res.status(200).send({deployment, resources, tagging})
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/resources/status/:id', auth, async (req, res) => {
    try {
        const deployment = await Deployments.findById(req.params.id)
        if (!deployment){ 
            return res.status(404).send({message:'Deployment not found'})
        }
        if (req.query.state){
            deployment.state = req.query.state
            await deployment.save()
        }
        res.status(200).send(deployment)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.delete('/resources/delete/:id', auth, async (req, res) => {
    try {
        const resource = await Resources.deleteOne({
            _id: req.params.id
        })
        // const deployment = await Deployments.find({
        //     author: resource.owner
        // })
        if(!resource){
            return res.status(404).send({message:'Resource not Found'})
        }
        // if(!deployment){
        //     return res.status(404).send({message:'Deployment not Found'})
        // }
        // if(deployment.state !== 0 || deployment.state !== 8 || deployment.state !== 13){
        //     return res.status(404).send({message:'Deployment active'})
        // }
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})


module.exports = router
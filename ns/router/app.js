const express = require('express')
const router = new express.Router()

// CONTEXT 
const Connector = require('../model/context/connector')

// SVC
const Name = require('../model/svc/name')
const Label = require('../model/svc/label')

// APP
const Config = require('../model/app/config')
const Deployment = require('../model/app/deployment')
const Tag = require('../model/app/tag')
const Resource = require('../model/app/resource')

// UTILS 
const { bodyQuery, objDocBuilder, tagBuilder, logicalNameBuilder, resourceTypeArray } = require('../src/util/name')
// const { valid } = require('../src/util/compare')
const auth = require('../middleware/auth')
const { fetch } = require('../connect/bin/aws')



/*
APP ENDPOINT 

RESOURCE, TAG, DEPLOYMENT, CONFIG
    > BODY QUERY FUNCTION WILL COMBINE BOTH, ABLE TO USE ONE OR OTHER IN-DEPENDANT
    > OBJECT DOC BUILDER WILL GET IMPORTANT DOCUMENT DATA TO AMEND TO TAGS
    > TAG BUILDER WILL COMPARE CURRENT OBJECT AND RETURN TAG AND CONFIG FOR THIS RESOURCE
        > TAG ELEMENT AND CONFIG ELEMENT VERIFICATION "IF ANY MISSING THROW ERROR"
        > IF THE ELEMENT IS REQUIRED IN BOTH TAG AND CONFIGURATION IT MUST BE DECLARED IN BOTH, SEE LABEL
        > SEEDING INTO ABBR REQUIRED BEFORE HAND
        > TAG ELEMENT ABBR STRING VERIFICATION PERFORMED
        > RELATIONSHIP CHECK PERFORMED 
    > LOGICAL NAME BUILDER
        > CONSTRUCT LABEL BASED ON ORDER PROVIDED WITH DELIMITER, UNION, PADDING FIELD 
        > NEXT NAME COUNT USING LABEL MAX COUNT FROM LABEL 
*/
router.post('/app', auth, async (req, res) => {
    try {
        // FUNC
        var object = null
        var builder = null
        var logicalName = null
        // MODEL
        var config = {} 
        var deployment = null
        var resource = null
        var tag = null

        // USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT 
        object = bodyQuery(req.body, req.query)
        // debugging
        // console.log('bodyQuery object =')
        // console.log(object)

        // USED TO COMBINE OBJECT AND FOUND "MONGO" DOCUMENTS "WITH MANDATORY MODELS" AND RETURN A SINGLE OBJECT 
        object = await objDocBuilder(object)
        // debugging
        // console.log('objDocBuilder object =')
        // console.log(object)

        // ERROR IN CALLING FUNCTION
        if(object.name){
            return res.status(404).send({message: object.message})
        }


        builder = await tagBuilder(object)
        // ERROR IN CALLING FUNCTION
        if(builder.name){
            // throw new Error(builder.message)
            return res.status(404).send({message: builder.message})
        }
        // debugging
        // console.log('tagBuilder object =')
        // console.log(builder)

        // COMPARE OBJECT WITH LABEL AND RETURN SCHEMA
        // RETURN LOGICAL NAME 
        // TODO FIX ERROR HANDLING LIKE ABOVE TAG BUILDER
        logicalName = await logicalNameBuilder(builder.tag)
        if(logicalName.name){
            return res.status(404).send({message: logicalName.message})
        }
        // debugging
        // console.log('logicalNameBuilder logicalName =')
        // console.log(logicalName)

        if(!object.cart){
            deployment = new Deployment({
                owner: object.connectorId,
                state: object.nameOnly === true ? 13 : 0
            })
            object.deploymentId = deployment._id
            builder.tag.deploymentId = object.deploymentId
            await deployment.save()
        }
        
        // IF CALLER/USER WANTS MORE ITEMS WILL NEED TO ITERATE
        // SEED RESOURCE
        resource = await new Resource({
            author: object.deploymentId,
            owner: object.connectorId,
            resourceType: builder.tag.resourceType,
            logicalName: logicalName,
            userDefined: true
        })
        await resource.save()

        // SEED NAME
        name = await new Name({
            author: resource._id, 
            fullName: logicalName
        })
        await name.save()

        // SEED CONFIG
        if (builder.config !== undefined){
            config = await new Config({
                author :  object.deploymentId,
                owner : resource._id,
                resourceType : resource.resourceType,
                ...builder.config
            })
            await config.save()
        }

        // SEED TAG
        builder.tag['resourceId'] = resource._id
        builder.tag['Name'] = resource.logicalName
        if(!builder.tag.deploymentId) {
            builder.tag['deploymentId'] = object.deploymentId
        }
        tag = await new Tag({
            author :  object.deploymentId,
            owner : resource._id,
            ...builder.tag
        })
        // SAVE COMMON DOCUMENTS 
        await tag.save()

        // TODO REMOVING SEE TAG MODEL EXPLANATION 
        // res.status(201).send({config, tag: tag.entry})
        res.status(201).send({config, tag})
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// USED BY SERVICE 
router.patch('/app:id', auth, async (req, res) => {
    try {
        // RESOURCE WITHIN BODY 
        if(req.query.document === 'resource'){
            // debugging
            // console.log(req.params.id)
            // console.log(req.body)
            const resource = await Resource.findById(req.params.id)
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
        res.status(200).send()
    } catch (e) {
        res.status(500).send(e)
    }
})

// ALL DOCUMENTS 
router.get('/app:id', auth, async (req, res) => {
    try {
        var object = {}

        // REQUIRED DOCUMENTS 
        // const a = await Deployment.find({})
        // console.log(a);
        const deployment = await Deployment.findById(req.params.id)
        if(!deployment){
            return res.status(404).send({message:'Deployment not found'})
        }
        const tag = await Tag.find({
            author: deployment._id
        })
        if(!tag.length > 0){
            return res.status(404).send({message:'Tag not found'})
        }
        var resource = await Resource.find({
            author: deployment._id
        })
        if(!resource.length > 0){
            return res.status(404).send({message:'Resource not found'})
        }
        const connector = await Connector.findOne({
            _id: deployment.owner
        })
        if(!connector){
            return res.status(404).send({message:'Connector not found'})
        }
        const config = await Config.find({
            author: deployment._id
        })
        if(!config.length > 0){
            return res.status(404).send({message:'Config not found'})
        }

        // SPECIFIC QUERY 
        // DOCUMENT RESOURCE DISTINCT LIST 
        if(req.query.document === 'distinct'){
            const distinct = await Resource.find({
                author: deployment._id
            }).distinct('resourceType')
            return res.status(200).send(distinct)
        }

        // DOCUMENT CONNECTOR
        if(req.query.document === 'connector'){
            return res.status(200).send(connector)
        }

        // DOCUMENT TAG, CONFIG, RESOURCE 
        if(req.query.document && req.query.document.match(/tag|config|resource/)){
            const doc = req.query.document === 'tag' ? tag 
                :  req.query.document === 'config' ? config
                : req.query.document === 'resource' ? resource 
                : {}
            object = await resourceTypeArray(doc)
            return res.status(200).send(object)
        }

        // DOCUMENT DEPLOYMENT
        if(req.query.document === 'deployment'){
            return res.status(200).send(deployment)
        }

        // DOCUMENT SECURITY 
        // if(req.query.document === 'security'){
        //     var ruleObject = {}
        //     var resourceObject = {}
        //     if (resource.length > 0){
        //         resource = resource.filter((x) => {
        //             // console.log(x.resourceType === 'SGRP')
        //             return x.resourceType === 'SGRP'
        //         })
        //         // debugging
        //         // console.log('resource =')
        //         // console.log(resource)
        //         // console.log('count =', resource.length)
        //         // console.log()
        //         for (let i = 0; i < resource.length; i++){
        //             // const rule = await SecurityRules.find({
        //             //     author: resource[i].id
        //             // })
        //             // debugging

        //             var rule = await Config.find({
        //                 author: resource[i].id
        //             })
        //             // console.log(`rule for, ${resource[i].id} = `)
        //             // console.log(rule)
        //             // console.log('count =', rule.length)
        //             // console.log()
        //             if (rule.length > 0){
        //                 for (let x = 0; x < rule.length; x++){
        //                     // SECURITY GROUP RESOURCE
        //                     var resource = {
        //                         logicalName: resource[i]['logicalName'],
        //                         resourceType: resource[i]['resourceType'],
        //                         logicalId: resource[i]['logicalId'],
        //                         resourceId: resource[i]['_id']
        //                     }

        //                     const rkey = rule[x]['forResource']
        //                     if(resourceObject[rkey] === undefined){
        //                         resourceObject[rkey] = resource
        //                     }
        //                     // RULES
        //                     var secure = {
        //                         port: rule[x]['port'], 
        //                         source: rule[x]['source'],
        //                         direction: rule[x]['direction'],
        //                         forResource: rule[x]['forResource'], 
        //                         toResource: rule[x]['toResource']
        //                     }
        //                     const skey = rule[x]['forResource']
        //                     if(ruleObject[skey] === undefined){
        //                         ruleObject[skey] = [secure]
        //                     }
        //                     else {
        //                         ruleObject[skey].push(secure)
        //                     }
        //                     // debugging
        //                     // console.log('resource =')
        //                     // console.log(resource)
        //                     // console.log('secure =')
        //                     // console.log(secure)
        //                 }
        //             }
        //         }
        //     }
        //     // TODO TESTING WITH SECURITY GROUP SPECIFIC SOURCE BASED ON TO RESOURCE
        //     // console.log('resourceObject =')
        //     // console.log(resourceObject)
        //     return res.status(200).send({
        //         resource: resourceObject,
        //         rules: ruleObject
        //     })
        // }

        // // PARENT RESOURCES, WILL FIND RESOURCES THAT ARE CREATED FOR THIS SPECIFIC "OWNER =" ACCOUNT 
        // if(req.query.document === 'parent'){
        //     var parent = await Resource.find({
        //         owner: account._id,
        //         userDefined: true
        //     })
        //     // debugging
        //     // console.log('parent =')
        //     // console.log(parent)
        //     parent = parent.filter ((x) => {
        //         return x.logicalId !== 'NULL'
        //     })
        //     if (parent.length > 0){
        //         for (let i = 0; i < parent.length; i++){
        //             var inner = {}
        //             var found = false
        //             5e450f955546150012480304const key = parent[i]['resourceType']
        //             // const label = await Label.findOne({
        //             //     resourceType: key
        //             // })
        //             // const accountCase = label.isUpperCase ? account.account.toUpperCase() : account.account.toLowerCase()
        //             // console.log('accountCase =')
        // }
        //             // console.log(accountCase)
        //             inner['logicalName'] = parent[i]['logicalName']
        //             inner['logicalId'] = parent[i]['logicalId']
        //             inner['resourceType'] = parent[i]['resourceType']
        //             inner['resourceId'] = parent[i]['id']

        //             const setting = await Config.findOne({
        //                 author: inner['resourceId']
        //             })
        //             // TODO, TEMP WILL REMOVE CONDITIONAL ONCE ALL NEW RESOURCES HAVE CREATED SETTINGS AT THE MOMENT NULL BELOW 
        //             // TODO, COPY RESOURCE DOCUMENT USE OF RESOURCE SETTINGS 
        //             var clone = {}
        //             if(setting){
        //                 clone = setting.toObject()
        //                 delete clone._id
        //                 delete clone.author
        //                 delete clone.owner
        //                 delete clone.__v
        //             } 
        //             // TODO EVAL THE BELOW MATCH MIGHT BE TO SPECIFIC 
        //        
        // found = inner['logicalName'].match(accountCase)
        //             const re = new RegExp(account.account, 'i')
        //             found = inner['logicalName'].match(re)
        //             if (found && Object.keys(clone).length > 0){
        //                 Object.keys(clone).forEach((x) => {
        //                     inner[x] = clone[x]
        //                 })
        //                 object[key] = inner
        //             }
        //         }
        //     }
        //     return res.status(200).send({resource: object})
        // }
        res.status(200).send({deployment, resource, tag, config})
    } catch (e) {
        console.error(e)
        res.status(500).send(e)
    }
})

/*
DEPLOYMENT ENDPOINTS 
*/

// FIND BY PARAM SET STATUS, WITH QUERY STRING
router.get('/app/deployment:id', auth, async (req, res) => {
    try {
        const deployment = await Deployment.findById(req.params.id)
        if (!deployment){ 
            return res.status(404).send({message:'Deployment not found'})
        }
        if (req.query.state){
            deployment.state = req.query.state
            await deployment.save()
        }
        return res.status(200).send(deployment)
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e.message)
    }
})

// FIND ALL, USE QUERY STRING FOR LIMIT AND SKIP 
router.get('/app/deployment', auth, async (req, res) => {
    try {
        var options = {}
        options.limit = 10

        if (req.query.limit){
            options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        }
        options.sort = {
            'updatedAt': -1
        }
        const deployment = await Deployment.find({}, null, options)
        res.status(200).send(deployment)
    } catch (e) {
        res.status(500).send()
    }
})

// REMOVE 
router.delete('/app/remove:id', auth, async (req, res) => {
    try {
        // RESOURCE OTHERWISE DEFAULT TO DEPLOYMENT
        if(req.query.document === 'resource'){
            const resource = await Resource.findByIdAndRemove({
                _id: req.params.id
            })
            if(!resource){
                return res.status(404).send({message:'Resource not Found'})
            }
        } else {
            const deployment = await Deployment.findByIdAndRemove({
                _id: req.params.id
            })
            if(!deployment){
                return res.status(404).send({message:'Deployment not Found'})
            }
        }
        res.status(200).send()
    } catch (e) {
        res.status(500).send({error: e.message})
    }
})

/*
TAG ENDPOINTS 
*/

// DISCOVERY 
// PARAM CONNECTOR
// RESOURCE TYPE REQUIRED TO FIND LABEL AND PROVIDE NECESSARY KEYS TO FIND RESOURCE 
// USE STATE QUERY STRING TO ENSURE STATE OF DEPLOYMENT 
router.get('/app/tag/discovery', auth, async (req, res) => {
    try {
        var label = null
        var tag = null
        var object = {}
        var options = {}
        var array = []
        var deployment = null

        // TODO, REMOVE CONNECTOR AS NOT NECESSARY WITHIN NAME SPACE LOOKUP
        // const connector = await Connector.findById(req.params.id)
        // if(!connector){
        //     return res.status(404).send({message:'Connector not found'})
        // }

        // // TODO, QUERY LIMIT AND SKIP
        // // Excluded as will filter based on deployment state if limited will not expose all entries 
        // if (req.query.limit){
        //     options.limit = parseInt(req.query.limit) > 50 ? 50 : parseInt(req.query.limit)
        // }
        // options.sort = {
        //     'updatedAt': -1
        // }
        // if (parseInt(req.query.skip) > 1){
        //     options.skip = parseInt(req.query.skip) 
        // }

        if(req.query.resourceType){
            label = await Label.findOne({
                resourceType: req.query.resourceType
            })
            if(!label){
                return res.status(404).send({message:'Label not found'})
            }
            // console.log('query =')
            // console.log(req.query)
            
            const merge = label.keyMap.concat(label.mandatoryTagKeys)
            // debugging
            // console.log('merge =')
            // console.log(merge)

            for (let i = 0; i < merge.length; i++){
                const x = merge[i]
                if(Object.keys(req.query).indexOf(x) === -1){
                    return res.status(404).send({message:`Key not Found ${x}`})
                } else {
                    object[x] = req.query[x]
                }
            }
            // debugging
            // console.log('object =')
            // console.log(object)

            // FIND BASED ON BODY 
            tag = await Tag.find({...object}, null, options)
            if(tag.length === 0){
                return res.status(404).send({message:'Tag not Found'})
            }
            // debugging
            // console.log('tag =')
            // console.log(tag)

            // FILTER BY STATE 
            if(req.query.state){
                // FIND DEPLOYMENT
                if(!Array.isArray(tag)){
                    tag = [tag]
                }
                for (let x = 0; x < tag.length; x++){
                    deployment = await Deployment.findById(tag[x].author)
                    // NO MATCH THROW
                    // debugging
                    // console.log({message:`Deployment State ${deployment.stateDescription}`})
                    if(req.query.state === deployment.state.toString()){
                        array.push(tag[x])
                    }
                }
            }
            else {
                array = tag
            }
        }
        if(array.length === 0){
            return res.status(404).send({message:'Tag, State Mismatch'})
        }
        // TODO, IDX IF NECESSARY 
        array = array.length === 1 ? array[0] : array
        res.status(200).send(array)
    } catch (e) {
        console.error(e)
        res.status(500).send(e)
    }
})

// // TODO EVAL IF SINGLE CREATE REQUIRED AS MULTI WILL CARTER FOR BOTH REQUESTS
// router.post('/app/seed', auth, async (req, res) => {
// })

/*
OTHER ENDPOINTS
~ EXPERIMENTAL 
*/

// // TODO IF NECESSARY 
// // AS COMPLEXITY REQUIRED 
// // HANDLED IN MAIN CONNECTOR MODEL
// // FETCH
router.get('/app/fetch:id', async (req, res) => {
    try {
        const connector = await Connector.findById(req.params.id)
        if(!connector){
            return res.status(404).send({message:'Connector not found'})
        }
        // NOTE THAT THE PROVIDER OF THE CONNECTOR WILL NEED TO BE A SPECIFIC CASE
        // UNNECESSARY HARD CODING
        if(connector.provider === 'aws'){
            await fetch(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_KEY,  process.env.AWS_REGION, connector)
        }
        res.status(200).send()
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// USED BY SERVICE TO UPDATE LOGICAL ID'S 
// router.patch('/resource/updateSetting/:id', auth, async (req, res) => {
//     try {
//         var resource = await Resource.findById(req.params.id)
//         if (!resource) {
//             return res.status(404).send({message:'Not Found'})
//         }
//         const setting = await Config.findOne({
//             author: resource.id
//         })
//         const isValid = valid(req.body, setting.schema.obj, exclude)
//         if (!isValid) {
//             return res.status(400).send({message:'Please provide a valid input'})
//         }
//         if (isValid){
//             const body = Object.keys(req.body)
//             for(let i = 0; i < body.length; i++){
//                 const value = body[i]
//                 setting[value] = req.body[value]
//             }
//             await setting.save()
//         }
//         res.status(201).send(setting)
//     } catch (e) {
//         res.status(500).send({error: e.message})
//     }
// })

// router.post('/resource/add/rule/:id', auth, async (req, res) => {
//     try {
//         // TODO NEED TO PROVIDE A ENDPOINT TO DELETE RULES 
//         // await SecurityRules.deleteMany({
//         // })
//         var group = await Resource.find({
//             author: req.params.id,
//             resourceType: 'SGRP'
//         })
//         // debugging
//         // console.log('group =')
//         // console.log(group.length)
//         var setting = null
//         for (let x = 0; x < group.length; x ++){
//             // console.log('group =')
//             // console.log(group[x])
//             setting = await Config.findOne({
//                 owner: req.params.id,
//                 author: group[x]._id
//             })
//             // console.log('setting =')
//             // console.log(setting)
//         }
//         // debugging
//         // console.log('group =')
//         // console.log(group)
//         if(!setting){
//             return res.status(404).send({message:'Group not Found'})
//         }
//         const resource = await Resource.findOne({
//             author: req.params.id,
//             resourceType: req.body.forResource
//         })
//         // console.log('resource =')
//         // console.log(resource)
//         if(!resource){
//             return res.status(404).send({message:'Resource not Found'})
//         }
        
//         // TODO DEPRECATE SECURITY RULES DOCUMENTS, MOVE TO RESOURCE SETTINGS
//         // const securityRule = await SecurityRules.find({
//         //     owner: req.params.id,
//         //     ...req.body
//         // })
//         const config = await Config.find({
//             owner: req.params.id,
//             ...req.body
//         })
//         // debugging
//         // console.log('config =')
//         // console.log(config)
//         if(config.length !== 0){
//             return res.status(404).send({message:'Rule Found'})
//         }
//         if(group.length >= 1){
//             group = group[0]
//         }
//         // TODO DEPRECATE SECURITY RULES DOCUMENTS, MOVE TO RESOURCE SETTINGS
//         // const rule = new SecurityRules({
//         //     author: group._id,
//         //     owner: req.params.id, 
//         //     ...req.body
//         // })
//         const rule = await new Config({
//             author: group._id,
//             owner: req.params.id, 
//             resourceType: group.resourceType,
//             ...req.body
//         })
//         await rule.save()
//         res.status(201).send(rule)
//     } catch (e) {
//         res.status(500).send({error: e.message})   
//     }
// })




module.exports = router
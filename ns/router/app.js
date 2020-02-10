const express = require('express')
const router = new express.Router()

// CONTEXT 
// const Perimeters = require('../model/context/perimeter')
// const Account = require('../model/context/account')
const Connector = require('../model/context/connector')

// SVC
const Name = require('../model/svc/name')
// const Label = require('../model/svc/labels')

// APP
const Config = require('../model/app/config')
const Deployment = require('../model/app/deployment')
const Tag = require('../model/app/tag')
const Resource = require('../model/app/resource')

// UTILS 
const { bodyQuery, objDocBuilder, tagBuilder, logicalNameBuilder, resourceTypeArray } = require('../src/util/name')
const auth = require('../middleware/auth')


/*
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
            entry: builder.tag
        })
        // SAVE COMMON DOCUMENTS 
        await tag.save()

        res.status(201).send({config, tag: tag.entry})
    } catch (e) {
        // logger.log('error', `${(e.message)}`)
        res.status(500).send(e)
    }
})

// // TODO EVAL IF SINGLE CREATE REQUIRED AS MULTI WILL CARTER FOR BOTH REQUESTS
// router.post('/resource/create/multiple', auth, async (req, res) => {
//     try {
//         // // USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT
//         // IF COUNT, SET 1 AS RESOURCE TYPE WILL SET THE COUNT PARAMETER
//         if(req.query.count){
//             req.query.count = 1
//         }
//         var object = bodyQuery(req.body, req.query)
//         // debugging
//         // console.log('bodyQuery object =')
//         // console.log(object)

//         var array = Array.isArray(object.resourceType) ? object.resourceType : [object.resourceType]
//         if (array.includes('STATE')){
//             array = ['STATE', 'RGRP', 'AGRP', 'S3', 'AUSR', 'RUSR', 'DYN']
//         }
//         for (let i = 0; i < array.length; i++){
//             var dolly = Object.assign({}, object)
//             dolly.resourceType = array[i]

//             // // USED TO COMBINE OBJECT AND FOUND "MONGO" DOCUMENTS "WITH MANDATORY MODELS" AND RETURN A SINGLE OBJECT 
//             dolly = await objDocBuilder(dolly)
//             // console.log('objDocBuilder dolly =')
//             // console.log(dolly)

//             // ERROR IN CALLING FUNCTION
//             if(dolly.name){
//                 return res.status(404).send({message: dolly.message})
//             }

//             // // TAG BUILDER WILL COMPARE CURRENT OBJECT AND RETURN TAG AND CONFIG FOR THIS RESOURCE
//             // // RESOURCE ELEMENT AND CONFIG ELEMENT VERIFICATION "IF ANY MISSING ELEMENTS" PERFORMED
//             // // IF THE ELEMENT IS REQUIRED IN BOTH TAG AND CONFIGURATION IT MUST BE DECLARED IN BOTH, SEE LABEL
//             // // TODO NEED TO CONFIRM THAT IF STRING FOR TAG IS NOT DEFINED IN abbr THAT A ERROR IS THROWN
//             // // > RATHER PERFORM ABOVE WHEN SEEDING, INSERTING abbrS 
//             var builder = await tagBuilder(dolly)
//             // ERROR IN CALLING FUNCTION, 
//             if(builder.name){
//                 return res.status(404), ({message: builder.message})
//             }object
//             // console.log('tagBuilder builder =')
//             // console.log(builder)

//             // // COMPARE OBJECT WITH LABEL AND RETURN SCHEMA
//             // // RETURN LOGICAL NAME 
//             // // TODO FIX ERROR HANDLING LIKE ABOVE TAG BUILDER
//             logicalName = await logicalNameBuilder(builder.tag)
//             if(logicalName.name){
//                 return res.status(404).send({message: logicalName.message})
//             }
//             // debugging
//             // console.log('logicalNameBuilder logicalName =')
//             // console.log(logicalName)

//             if(!dolly.cart){
//                 deployment = new Deployment({
//                     author: dolly.accountId,
//                     state: dolly.nameOnly === true ? 13 : 0
//                 })
//                 // UPDATING CLONED OBJECT 
//                 object.deploymentId = deployment._id
//                 builder.tag.deploymentId = object.deploymentId
//                 object.cart = object.cart !== true ? true : false
//                 await deployment.save()
//             }
//             // debugging
//             // console.log('deployment =')
//             // console.log(deployment)

//             // // SEED RESOURCE
//             const resource = await new Resource({
//                 author: object.deploymentId,
//                 owner: dolly.accountId,
//                 resourceType: builder.tag.resourceType,
//                 logicalName: logicalName,
//                 userDefined: true
//             })
//             await resource.save()
//             // debugging
//             // console.log('resource =')
//             // console.log(resource)

//             // // SEED NAME
//             const name = await new Name({
//                 author: resource._id, 
//                 fullName: logicalName
//             })
//             await name.save()
//             // debugging
//             // console.log('name =')
//             // console.log(name)
            
//             // // SEED RESOURCE SETTINGS
//             if (builder.config){
//                 const config = await new Config({
//                     author : resource._id,
//                     owner : object.deploymentId,
//                     resourceType : resource.resourceType,
//                     ...builder.config
//                 })
//                 await config.save()
//             }
//             // // SEED TAGS 
//             // // USING EXISTING DEPLOYMENT/CART FOR RESOURCE TO GROUP RESOURCES
//             var tag = null
//             if(dolly.cart){
//                 tag = await Tag.find({
//                     author: object.deploymentId
//                 })
//             }else{
//                 tag = await new Tag({
//                     author: object.deploymentId,
//                     entries: builder.tag
//                 })
//                 // // SAVE COMMON DOCUMENTS 
//                 await tag.save()
//             }
//             // debugging
//             // console.log('tagging =')
//             // console.log(tagging)
//         }

//         await res.status(201).send({deploymentId:object.deploymentId})
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

// router.get('/resource/Deployment', auth, async (req, res) => {
//     try {
//         var Options = {}
//         Options.limit = parseInt(req.query.limit) >= 50 ? parseInt(req.query.limit) : 50
//         Options.skip = req.query.skip ? req.query.skip : 0
//         const deployment = await Deployment.find({}, null, Options)
//         res.status(200).send(deployment)
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

// // TODO JUST EVAL/TESTING IF NECESSARY AS HANDLED IN MAIN CONNECTOR MODEL
// router.get('/resource/discovery/:id', async (req, res) => {
//     try {
//         const connector = await MainConnector.findById(req.params.id)
//         if(!connector){
//             return res.status(404).send({message:'Connector not found'})
//         }
//         if(connector.provider === 'AWS'){
//             await discover(process.env.AWS_ACCESS_KEY, process.env.AWS_SECRET_KEY, connector)
//         }
//         res.status(200).send()
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

// // USED BY SERVICE TO UPDATE LOGICAL ID'S 
// router.patch('/resource/update/:id', auth, async (req, res) => {
//     const exclude = ['author', 'owner', '_id']
//     // console.log('req.body =')
//     // console.log(req.body)
//     const isValid = valid(req.body, Resource.schema.obj, exclude)
//     // console.log('isValid =')
//     // console.log(isValid)
//     if (!isValid) {
//         return res.status(400).send({message:'Please provide a valid input'})
//     }
//     try {
//         const resource = await Resource.findById(req.params.id)
//         if (!resource) {
//             return res.status(404).send({message:'Not Found'})
//         }
//         // debugging
//         // console.log(resource)
//         const body = Object.keys(req.body)
//         body.forEach(value => {
//             resource[value] = req.body[value]
//         })
//         await resource.save()
//         res.status(201).send(resource)
//     } catch (e) {
//         res.status(500).send({error: e.message})
//     }
// })

// // USED BY SERVICE TO UPDATE LOGICAL ID'S 
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

router.get('/app/:id', auth, async (req, res) => {
    try {
        var object = {}

        // REQUIRED DOCUMENTS 
        const deployment = await Deployment.findById(req.params.id)
        if(!deployment){
            return res.status(404).send({message:'Deployment not found'})
        }
        const tag = await Tag.find({
            author: deployment._id
        })
        var resource = await Resource.find({
            author: deployment._id
        })
        const connector = await Connector.findOne({
            _id: deployment.owner
        })
        const config = await Config.find({
            author: deployment._id
        })
        if(!resource){
            return res.status(404).send({message:'Resource not found'})
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
        if(req.query.document.match(/tag|config|resource/)){
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

        // // DISCOVERY IS USED FOR FINDING RESOURCES THAT ARE DEPLOYED POST, API AND NOT USER DEFINED
        // if(req.query.document === 'discovery'){
        //     const discovery = await Resource.find({
        //         owner: account.owner,
        //         author: account.owner,
        //         userDefined: false
        //     })
        //     // debugging
        //     // console.log('discovery =')
        //     // console.log(discovery)
        //     if (discovery.length > 0){
        //         for (let i = 0; i < discovery.length; i++){
        //             var inner = {}
        //             var found = false
        //             const key = discovery[i]['resourceType']
        //             inner['logicalName'] = discovery[i]['logicalName']
        //             inner['logicalId'] = discovery[i]['logicalId']
        //             inner['resourceType'] = discovery[i]['resourceType']
        //             inner['resourceId'] = discovery[i]['_id']
        //             // debugging
        //             // console.log('inner =')
        //             // console.log(inner)
        //             const setting = await Config.findOne({
        //                 author: inner['resourceId']
        //             })
        //             // debugging
        //             // console.log('setting =')
        //             // console.log(setting)
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
        //             const re = new RegExp(account.account, 'i')
        //             found = inner['logicalName'].match(re)
        //             if(found){
        //                 inner['accountMatch'] = 'true'
        //             } else {
        //                 inner['accountMatch'] = 'false'
        //             }
        //             if (Object.keys(clone).length > 0){
        //                 Object.keys(clone).forEach((x) => {
        //                     inner[x] = clone[x]
        //                 })
        //             }
        //             object[key] = inner
        //         }
        //     }
        //     return res.status(200).send({resource: object})
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
        //             const key = parent[i]['resourceType']
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
        //             // found = inner['logicalName'].match(accountCase)
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

        // if(req.query.document === 'account'){
        //     return res.status(200).send({account: account})
        // }

        // if(req.query.document === 'perimeter'){
        //     const perimeter = await Perimeters.findOne({
        //         author: connector.id
        //     })
        //     if(!perimeter){
        //         return res.status(404).send({message:'Perimeters not found'})
        //     }
        //     object['public'] = perimeter['perimeterLabel']
        //     object['private'] = perimeter['backOfficeLabel']
        //     object['internet'] = perimeter['breakoutLabel']
        //     object['default'] = '*'
        //     return res.status(200).send({perimeter: object})
        // }

        // if(req.query.document === 'state'){
        //     if(!account.remoteStateReadyEnabled){
        //         return res.status(500).send({message:'Bad state, Repair'})
        //     }
        //     const state = await Resource.find({
        //         author: account.remoteStateDeploymentId
        //     })
        //     if(!state){
        //         return res.status(404).send({message:'State not found'})
        //     }
        //     var result = {}
        //     state.filter ((x) => {
        //         // console.log(x)
        //         if (x.resourceType === 'DYN' || x.resourceType === 'S3') {
        //             result[x.resourceType] = x.logicalName
        //         }
        //     })
        //     // console.log(result)
        //     return res.status(200).send(result)
        // }
        res.status(200).send({deployment, resource, tag, config})
    } catch (e) {
        console.error(e)
        res.status(500).send(e)
    }
})

// router.get('/app/:id', auth, async (req, res) => {
//     try {
//         var object = {}
//         var resourceType = null

//         const deployment = await Deployment.findById(req.params.id)
//         if(!deployment){
//             return res.status(404).send({message:'Deployment not found'})
//         }
//         const tag = await Tag.find({
//             author: deployment._id
//         })
//         var resource = await Resource.find({
//             author: deployment._id
//         })
//         const connector = await MainConnector.findOne({
//             _id: deployment.owner
//         })
//         const config = await Config.find({
//             author: deployment._id
//         })
//         if(!resource){
//             return res.status(404).send({message:'Resource not found'})
//         }
//         if(resource.length > 1){
//             resourceType = await Resource.find({
//                 author: deployment._id
//             }).distinct('resourceType')
//             if(resourceType.length > 1){
//                 tag.entry.resourceType = resourceType.join('-')
//                 await tag.save()
//             }        
//         }
//         if(req.query.document === 'resource'){
//             if (resource.length > 0){
//                 for (let i = 0; i < resource.length; i++){
//                     if (resource[i]['resourceType'] !== 'SGRP'){
//                         // console.log(resource[i])
//                         var inner = {}
//                         const key = resource[i]['resourceType']
//                         // // debugging
//                         // console.log('key =')
//                         // console.log(key)
//                         inner['logicalName'] = resource[i]['logicalName']
//                         inner['resourceId'] = resource[i]['id']
//                         if (resource[i]['logicalId'] !== 'NULL'){
//                             inner['logicalId'] = resource[i]['logicalId']
//                         }
//                         inner['resourceType'] = resource[i]['resourceType']
//                         // JOIN SETTING AND RESOURCE 
//                         const setting = await Config.findOne({
//                             author: inner['resourceId'] 
//                         })
//                         const clone = setting.toObject()
//                         delete clone._id
//                         delete clone.author
//                         delete clone.owner
//                         delete clone.__v
//                         if (Object.keys(clone).length > 0){
//                             Object.keys(clone).forEach((x) => {
//                                 const val = clone[x]
//                                 inner[x] =  val !== typeof String ? val.toString() : val
//                             })
//                         }
//                         object[key] = inner
//                     }
//                 }
//             }
//             return res.status(200).send({resource: object})
//         }
//         if(req.query.document === 'resourceArray'){
//             // console.log(resource)
//             if (resource.length > 0){
//                 for (let i = 0; i < resource.length; i++){
//                     if (resource[i]['resourceType'] !== 'SGRP'){
//                         // console.log(resource[i])
//                         var inner = {}
//                         const key = resource[i]['resourceType']
//                         inner['logicalName'] = resource[i]['logicalName']
//                         inner['resourceId'] = resource[i]['id']
//                         if (resource[i]['logicalId'] !== 'NULL'){
//                             inner['logicalId'] = resource[i]['logicalId']
//                         }
//                         inner['resourceType'] = resource[i]['resourceType']
//                         // JOIN SETTING AND RESOURCE 
//                         const setting = await Config.findOne({
//                             author: inner['resourceId'] 
//                         })
//                         const clone = setting.toObject()
//                         delete clone._id
//                         delete clone.author
//                         delete clone.owner
//                         delete clone.__v

//                         if (Object.keys(clone).length > 0){
//                             Object.keys(clone).forEach((x) => {
//                                 const val = clone[x]
//                                 inner[x] =  val !== typeof String ? val.toString() : val
//                             })
//                         }
//                         if(object[key] !== undefined){
//                             object[key].push(inner)
//                         } 
//                         else {
//                             object[key] = [inner]
//                         }
//                     }
//                 }
//             }
//             return res.status(200).send({resource: object})
//         }
//         if(req.query.document === 'security'){
//             var ruleObject = {}
//             var resourceObject = {}
//             if (resource.length > 0){
//                 resource = resource.filter((x) => {
//                     // console.log(x.resourceType === 'SGRP')
//                     return x.resourceType === 'SGRP'
//                 })
//                 // debugging
//                 // console.log('resource =')
//                 // console.log(resource)
//                 // console.log('count =', resource.length)
//                 // console.log()
//                 for (let i = 0; i < resource.length; i++){
//                     // const rule = await SecurityRules.find({
//                     //     author: resource[i].id
//                     // })
//                     // debugging

//                     var rule = await Config.find({
//                         author: resource[i].id
//                     })
//                     // console.log(`rule for, ${resource[i].id} = `)
//                     // console.log(rule)
//                     // console.log('count =', rule.length)
//                     // console.log()
//                     if (rule.length > 0){
//                         for (let x = 0; x < rule.length; x++){
//                             // SECURITY GROUP RESOURCE
//                             var resource = {
//                                 logicalName: resource[i]['logicalName'],
//                                 resourceType: resource[i]['resourceType'],
//                                 logicalId: resource[i]['logicalId'],
//                                 resourceId: resource[i]['_id']
//                             }

//                             const rkey = rule[x]['forResource']
//                             if(resourceObject[rkey] === undefined){
//                                 resourceObject[rkey] = resource
//                             }
//                             // RULES
//                             var secure = {
//                                 port: rule[x]['port'], 
//                                 source: rule[x]['source'],
//                                 direction: rule[x]['direction'],
//                                 forResource: rule[x]['forResource'], 
//                                 toResource: rule[x]['toResource']
//                             }
//                             const skey = rule[x]['forResource']
//                             if(ruleObject[skey] === undefined){
//                                 ruleObject[skey] = [secure]
//                             }
//                             else {
//                                 ruleObject[skey].push(secure)
//                             }
//                             // debugging
//                             // console.log('resource =')
//                             // console.log(resource)
//                             // console.log('secure =')
//                             // console.log(secure)
//                         }
//                     }
//                 }
//             }
//             // TODO TESTING WITH SECURITY GROUP SPECIFIC SOURCE BASED ON TO RESOURCE
//             // console.log('resourceObject =')
//             // console.log(resourceObject)
//             return res.status(200).send({
//                 resource: resourceObject,
//                 rules: ruleObject
//             })
//         }
//         if(req.query.document === 'connector'){
//             return res.status(200).send({connector: connector})
//         }
//         // DISCOVERY IS USED FOR FINDING RESOURCES THAT ARE DEPLOYED POST, API AND NOT USER DEFINED
//         if(req.query.document === 'discovery'){
//             const discovery = await Resource.find({
//                 owner: account.owner,
//                 author: account.owner,
//                 userDefined: false
//             })
//             // debugging
//             // console.log('discovery =')
//             // console.log(discovery)
//             if (discovery.length > 0){
//                 for (let i = 0; i < discovery.length; i++){
//                     var inner = {}
//                     var found = false
//                     const key = discovery[i]['resourceType']
//                     inner['logicalName'] = discovery[i]['logicalName']
//                     inner['logicalId'] = discovery[i]['logicalId']
//                     inner['resourceType'] = discovery[i]['resourceType']
//                     inner['resourceId'] = discovery[i]['_id']
//                     // debugging
//                     // console.log('inner =')
//                     // console.log(inner)
//                     const setting = await Config.findOne({
//                         author: inner['resourceId']
//                     })
//                     // debugging
//                     // console.log('setting =')
//                     // console.log(setting)
//                     // TODO, TEMP WILL REMOVE CONDITIONAL ONCE ALL NEW RESOURCES HAVE CREATED SETTINGS AT THE MOMENT NULL BELOW 
//                     // TODO, COPY RESOURCE DOCUMENT USE OF RESOURCE SETTINGS 
//                     var clone = {}
//                     if(setting){
//                         clone = setting.toObject()
//                         delete clone._id
//                         delete clone.author
//                         delete clone.owner
//                         delete clone.__v
//                     } 
//                     // TODO EVAL THE BELOW MATCH MIGHT BE TO SPECIFIC
//                     const re = new RegExp(account.account, 'i')
//                     found = inner['logicalName'].match(re)
//                     if(found){
//                         inner['accountMatch'] = 'true'
//                     } else {
//                         inner['accountMatch'] = 'false'
//                     }
//                     if (Object.keys(clone).length > 0){
//                         Object.keys(clone).forEach((x) => {
//                             inner[x] = clone[x]
//                         })
//                     }
//                     object[key] = inner
//                 }
//             }
//             return res.status(200).send({resource: object})
//         }
//         // PARENT RESOURCES, WILL FIND RESOURCES THAT ARE CREATED FOR THIS SPECIFIC "OWNER =" ACCOUNT 
//         if(req.query.document === 'parent'){
//             var parent = await Resource.find({
//                 owner: account._id,
//                 userDefined: true
//             })
//             // debugging
//             // console.log('parent =')
//             // console.log(parent)
//             parent = parent.filter ((x) => {
//                 return x.logicalId !== 'NULL'
//             })
//             if (parent.length > 0){
//                 for (let i = 0; i < parent.length; i++){
//                     var inner = {}
//                     var found = false
//                     const key = parent[i]['resourceType']
//                     // const label = await Label.findOne({
//                     //     resourceType: key
//                     // })
//                     // const accountCase = label.isUpperCase ? account.account.toUpperCase() : account.account.toLowerCase()
//                     // console.log('accountCase =')
//                     // console.log(accountCase)
//                     inner['logicalName'] = parent[i]['logicalName']
//                     inner['logicalId'] = parent[i]['logicalId']
//                     inner['resourceType'] = parent[i]['resourceType']
//                     inner['resourceId'] = parent[i]['id']

//                     const setting = await Config.findOne({
//                         author: inner['resourceId']
//                     })
//                     // TODO, TEMP WILL REMOVE CONDITIONAL ONCE ALL NEW RESOURCES HAVE CREATED SETTINGS AT THE MOMENT NULL BELOW 
//                     // TODO, COPY RESOURCE DOCUMENT USE OF RESOURCE SETTINGS 
//                     var clone = {}
//                     if(setting){
//                         clone = setting.toObject()
//                         delete clone._id
//                         delete clone.author
//                         delete clone.owner
//                         delete clone.__v
//                     } 
//                     // TODO EVAL THE BELOW MATCH MIGHT BE TO SPECIFIC 
//                     // found = inner['logicalName'].match(accountCase)
//                     const re = new RegExp(account.account, 'i')
//                     found = inner['logicalName'].match(re)
//                     if (found && Object.keys(clone).length > 0){
//                         Object.keys(clone).forEach((x) => {
//                             inner[x] = clone[x]
//                         })
//                         object[key] = inner
//                     }
//                 }
//             }
//             return res.status(200).send({resource: object})
//         }
//         if(req.query.document === 'tagging'){
//             return res.status(200).send({tagging: tag['entries']})
//         }
//         if(req.query.document === 'deployment'){
//             return res.status(200).send({deployment: deployment})
//         }
//         if(req.query.document === 'account'){
//             return res.status(200).send({account: account})
//         }
//         if(req.query.document === 'perimeter'){
//             const perimeter = await Perimeters.findOne({
//                 author: connector.id
//             })
//             if(!perimeter){
//                 return res.status(404).send({message:'Perimeters not found'})
//             }
//             object['public'] = perimeter['perimeterLabel']
//             object['private'] = perimeter['backOfficeLabel']
//             object['internet'] = perimeter['breakoutLabel']
//             object['default'] = '*'
//             return res.status(200).send({perimeter: object})
//         }
//         if(req.query.document === 'state'){
//             if(!account.remoteStateReadyEnabled){
//                 return res.status(500).send({message:'Bad state, Repair'})
//             }
//             const state = await Resource.find({
//                 author: account.remoteStateDeploymentId
//             })
//             if(!state){
//                 return res.status(404).send({message:'State not found'})
//             }
//             var result = {}
//             state.filter ((x) => {
//                 // console.log(x)
//                 if (x.resourceType === 'DYN' || x.resourceType === 'S3') {
//                     result[x.resourceType] = x.logicalName
//                 }
//             })
//             // console.log(result)
//             return res.status(200).send(result)
//         }
//         res.status(200).send({deployment, resource, tag, config})
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

// router.get('/resource/status/:id', auth, async (req, res) => {
//     try {
//         const deployment = await Deployment.findById(req.params.id)
//         if (!deployment){ 
//             return res.status(404).send({message:'Deployment not found'})
//         }
//         if (req.query.state){
//             deployment.state = req.query.state
//             await deployment.save()
//         }
//         res.status(200).send(deployment)
//     } catch (e) {
//         // logger.log('error', `${(e.message)}`)
//         res.status(500).send(e)
//     }
// })

// router.delete('/resource/delete/:id', auth, async (req, res) => {
//     try {
//         const resource = await Resource.deleteOne({
//             _id: req.params.id
//         })
//         // const deployment = await Deployment.find({
//         //     author: resource.owner
//         // })
//         if(!resource){
//             return res.status(404).send({message:'Resource not Found'})
//         }
//         // if(!deployment){
//         //     return res.status(404).send({message:'Deployment not Found'})
//         // }
//         // if(deployment.state !== 0 || deployment.state !== 8 || deployment.state !== 13){
//         //     return res.status(404).send({message:'Deployment active'})
//         // }
//         res.status(200).send()
//     } catch (e) {
//         res.status(500).send({error: e.message})
//     }
// })


module.exports = router
// LABELS AND TAGS
const Labels = require('../../model/config/labels')
const Names = require('../../model/config/names')
const Configs = require('../../model/config')
// CONTEXT 
const MainConnector = require('../../model/connector')
const OrganizationalUnit = require('../../model/context/ou')
const Environments = require('../../model/context/environments')
const Perimeters = require('../../model/context/perimeter')
const Locations = require('../../model/context/locations')
const Networks = require('../../model/context/networks')
const Tenants = require('../../model/context/tenants')
// SUB MODELS
const Deployments = require('../../model/deployment')
// UTILS 
const { setValues, rightKey } = require('./compare')


var buildLabel = async (obj = {}) => {
    try {
        var prefix = []
        var result = {}
        // FIND LABEL BASED ON RESOURCE TYPE
        const label = await Labels.findOne({
            resourceType: obj.resourceType
        })
        if(!label){
            throw new Error('Label not found')
        }
        // debugging
        // console.log('label =')
        // console.log(label)
        // CONSTRUCT PARAMETERS FOR LOGIC BELOW 
        const delimiter = label.stringDelimiter
        const union = label.union
        const padding = label.padding
        // LOOP OVER KEYS WITHIN LABEL IN SPECIFIC ORDER
        for (let i = 0; i < label.keyMap.length; i++){
            const element = label.keyMap[i]
            const value = obj[element] // = label.isUpperCase ? obj[element].toUpperCase() : obj[element].toLowerCase()
            prefix.push(value)
        }
        // JOIN AND UNION ARRAY IF DUPLICATES FOUND
        if (delimiter === ''){
            const re = new RegExp(/\-/gi)
            const string = prefix.join('~').replace(re, '~')
            const set = new Set(string.split('~'))
            const array = Array.from(set)
            result['prefix'] = union ? array.join(delimiter) : string.replace(/\~/gi, delimiter)
        }else {
            const string = prefix.join(delimiter)
            const set = new Set(string.split(delimiter))
            const array = Array.from(set)
            result['prefix'] = union ? array.join(delimiter) : string
            result['prefix'] = result['prefix'].concat(delimiter)
        }
        result.suffix = padding
        result.delimiter = delimiter
        result.upperCase = label.isUpperCase
        // RETURN OBJECT
        return result
    } catch (e) {
        console.error(e)
        throw new Error(e)
    }
}

var nextName = async (name = {}) => {
    try {
        name.prefix = !name.upperCase ? name.prefix.toLowerCase() : name.prefix.toUpperCase()
        const re = new RegExp(name.prefix)
        var padding = name.suffix.split('')
        var count = await Names.countDocuments({'fullName': {$regex: re}})
        if (count >= 0){
            count++
            count = count.toString().split('')
            if(count.length <= padding.length){
                for (let i = 0; i < count.length; i++){
                    padding.pop()
                }
                padding = Array.isArray(padding) === true ? padding.join('') : padding
                count = Array.isArray(count) === true ? count.join('') : count
                return [name.prefix, padding, count]
            } else if (name.suffix === '') {
                count = Array.isArray(count) === true ? count.join('') : count
                return [name.prefix, padding, count]
            }
        }
        throw new Error('Bad name')
    } catch (e) {
        console.error(e)
        throw new Error(e)
    }
}

var logicalNameBuilder = async (obj, run = null) => {
    try {
        var name = null
        // CREATE NAME BASED ON LABEL CRITERIA
        name = await buildLabel(obj)
        // debugging
        // console.log(name)
        // IF NULL OR LENGTH ZERO RETURN NULL
        if(name === null || name.length === 0){
            return name
        }
        // FIND NEXT NAME WITHIN NAMESPACE 
        name = await nextName(name)
        if(name.length <= 0){
            // name = await seedName(name)
            return name
        }
        name = Array.isArray(name) === true ? name.join('') : name
        // console.log('name =')
        // console.log(name)
        return name
    } catch (e) {
        console.error(e)
        return new Error(e)
    }
   
}

// // DEFAULT TAG BUILDER
// TODO THROW ERRORS IN ABOVE FUNCTIONS, WHEN BUILDING LABEL
var tagBuilder = async (object = {}) => {
    try {
        // CONFIGURATION OBJECT 
        var configuration = {}
        // GET MANDATORY FLAGS
        var defaults = await Configs.findOne({})
        // IF NULL THROW ERROR
        if(!defaults){
            throw new Error('No defaults')
        }
        // COMPARE WITH MANDATORY FLAGS WITH OBJECT CONSTRUCTED 
        defaults.mandatoryTagsKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw new Error(`Default mandatory key, ${x}`)
            }
        })
        // GET LABEL MANDATORY FLAGS
        var label = await Labels.findOne({
            resourceType: object.resourceType
        })
        // IF NULL THROW ERROR
        if(!label){
            throw new Error('Label not found')
        }
        // COMPARE WITH RESOURCE TAGS
        label.mandatoryTagsKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw new Error(`Label mandatory key, ${x}`)
            }
        })
        // COMPARE WITH RESOURCE TAGS
        label.mandatoryConfigKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw new Error(`Label configuration object, ${x}`)
            }
            if(found){
                configuration[x] = object[x]
                delete object[x]
            }
        })
        // FILTER TAGS WITH BOTH DEFAULT AND RESOURCE TAGS TO REMOVE CLUTTER
        var result = {}
        var set = new Set(defaults.mandatoryTagsKeys.concat(label.mandatoryTagsKeys))
        var filter = Array.from(set)
        for (let i = 0; i < filter.length; i++) {
            const key = filter[i]
            const value = object[key]
            if(object[key] === undefined){
                throw new Error(`Bad element, ${filter[i]}`)
            }
            result[key] = value
        }

        const full = {}
        full['tag'] = result
        full['configuration'] = configuration
        return full
    } catch (e) {
        console.error(e)
        return new Error(e)
    }
}

// USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT 
var bodyQuery = (body = {}, query = {}) => {
    
    var object = Object.assign(body, query)

    // MANDATORY ELEMENTS 
    // // ENVIRONMENT, REMEMBER IF PROVIDED THIS NEEDS TO BE THE KEY VALUE
    object.businessEntity = object.businessEntity !== undefined ? object.businessEntity : undefined
    object.environments = object.environments !== undefined ? object.environments : undefined
    object.provider = object.provider !== undefined ? object.provider : undefined
    object.resourceType = object.resourceType !== undefined ? object.resourceType : undefined
    // object.resourceType = Array.isArray(object.resourceType) ? object.resourceType : [object.resourceType]
    object.locations = object.locations !== undefined ? object.locations : undefined
    // // TODO, APPLICATION ABBREVIATIONS, NEED TO VER VERIFIED
    object.application = object.application ? object.application : undefined
    // OPTIONAL ELEMENTS 
    object.deploymentId = object.deploymentId !== undefined ? object.deploymentId : 'null'
    object.network = object.network !== undefined ? object.network : undefined
    object.perimeters = object.perimeters !== undefined ? object.perimeters : undefined
    object.nameOnly = object.nameOnly === 'true' ? true : false

    // BEHAVIOUR
    // CART WILL GROUP DEPLOYMENTS
    object.cart = object.deploymentId !== 'null' ? true : false

    // LOGICAL NAME PER RESOURCE 
    object.logicalName = null

    // IF NAME ONLY PARAM IS USED THEN SET CART TO FALSE
    if(object.cart && object.nameOnly){
        object.cart = !object.cart
        // object.deploymentId = undefined
    }

    return object
}

var objDocBuilder = async (object = {}) => {
    // // FIND DOCUMENTS AND INCLUDE BASED ON QUERY STRING 
    try {
        const account = await OrganizationalUnit.findOne({
            account: object.account
        })
        if(!object.account){
            // return res.status(404).send({message:'Account null'})
            return new Error('Account null')
        }
        object.accountId = account._id
        // // STATE CONFIGURED ACCOUNT CAN NOT DEPLOY ANOTHER REMOTE STATE
        if (account.remoteStateReadyEnabled){
            if(object.resourceType === 'STATE'){
                // return res.status(404).send({message:'Existing state'})
                return new Error('Existing state')
            }
        } else if (!account.remoteStateReadyEnabled && !object.nameOnly && object.application !== 'TFSTATE') {
            // return res.status(404).send({message:'Bad state, Repair'})
            return new Error('Bad state, Repair')
        }
        
        // // DOES ACCOUNT HAVE THE NAME OF THE ENVIRONMENT AND IF NOT A PARAM IS REQUIRED
        const environments = await Environments.findOne({
            author: account.owner
        })
        const exclude = ['author']
        var array = await setValues(environments.schema.obj, environments, exclude)
        if(object.environments === undefined){
            const find = account.account.split('-').filter(x => array.includes(x))[0]
            object.environments = find
        } else {
            object.environments = environments[object.environments]
        }
        if(!object.environments){
            // return res.status(404).send({message:'Environment required'})
            return new Error('Environment required')
        }
    
        // // SEED DEPLOYMENT / IF DEPLOYMENT ID FOUND IN APPEND
        var deployment = null
        if(object.deploymentId !== 'null'){
            deployment = await Deployments.findById(object.deploymentId)
            if(!deployment){
                // return res.status(404).send({message:'Deployment null'})
                return new Error('Deployment null')
            }
            object.cart = true
            object.deploymentId = deployment._id
        }
        // // FIND TENANT
        const tenant = await Tenants.findById(account.author)
        object.businessEntity = tenant.businessEntity
        object.cluster = tenant.cluster
    
        // FIND CONNECTOR
        const connector = await MainConnector.findOne({
            _id: account.owner,
            provider: object.provider
        })
        object.provider = connector.provider
        object.groupOrganization = connector.groupOrganization
        
        // FIND LOCATION
        var locations = null
        if(object.locations !== undefined){
            locations = await Locations.findOne({
                author: connector.id
            }, null)
            object.locations = locations[`${object.locations}Synonym`]
        }
    
        // FIND NETWORK / PERIMETER
        var networks = null
        if(object.network !== undefined){
            var match = {}
            match.network = object.network
            networks = await Networks.findOne({
                author: connector.id
            }, null, match)
            object.network = networks.label
        }
        var perimeters = null
        if(object.perimeters !== undefined){
            perimeters = await Perimeters.findOne({
                author: connector.id
            }, null)
            const key = rightKey(object.perimeters, Perimeters.schema.obj, 'Label')
            object.perimeters = perimeters[key]
        }
        return object
    } catch (e) {
        console.error(e)
        return new Error(e)
    }
}

module.exports = { 
    logicalNameBuilder,
    tagBuilder,
    bodyQuery,
    objDocBuilder
}
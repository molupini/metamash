// MODELS
// SVC
const Label = require('../../model/svc/label')
const Name = require('../../model/svc/name')
const Conf = require('../../model/svc/conf')
const Abbr = require('../../model/svc/abbr')
// CONTEXT 
const Connector = require('../../model/context/connector')
const Relationship = require('../../model/context/relationship')
// APP
const Deployment = require('../../model/app/deployment')
const Resource = require('../../model/app/resource')


// USED TO COMBINE QUERY AND THE BODY AND RETURN A SINGLE OBJECT 
var bodyQuery = (body = {}, query = {}) => {
    
    var object = Object.assign(body, query)
    // BEHAVIOUR
    // CART WILL GROUP DEPLOYMENTS
    object.cart = object.deploymentId !== undefined ? true : false
    // ADD CONNECTOR ID
    object.connectorId = object.connectorId !== undefined ? object.connectorId : false
    // LOGICAL NAME PER RESOURCE 
    object.Name = null

    return object
}

// FIND DOCUMENTS AND INCLUDE BASED ON QUERY STRING 
var objDocBuilder = async (object = {}) => {

    try {
        var deployment = null
        var connector = null

        // SEED DEPLOYMENT / IF DEPLOYMENT ID FOUND IN APPEND
        if(object.cart){
            deployment = await Deployment.findById(object.deploymentId)
            if(!deployment){
                throw 'Deployment not Found'
            }
            object.cart = true
            object.deploymentId = deployment._id
        }

        // VERIFY STANDALONE LABELS WITHIN DEPLOYMENT 
        if(object.cart){
            const label = await Label.find({
                // resourceType: object.resourceType,
                standAlone: true
            }).distinct('resourceType')
            // debugging
            // console.log('label =')
            // console.log(label)
            if(label.length > 0){
                const resource = await Resource.find({
                    author: object.deploymentId
                }).distinct('resourceType')
                // debugging
                // console.log('resource =')
                // console.log(resource)
                resource.filter((x) => {
                    if(label.indexOf(x) !== -1){
                        throw `StandAlone Resource ${x}`
                    }
                })
            }
        }
    
        // FIND CONNECTOR
        if(object.connectorId){
            connector = await Connector.findById(object.connectorId)
            if(!connector){
                throw 'Connector not Found'
            }
            object.provider = connector.provider
            object.rootOrganization = connector.rootOrganization
        }
        return object
    } catch (e) {
        console.error(e)
        return new Error(e)
    }
}

// TAG BUILDER AND CONFIGURATION BUILD FOR SVC "DEFAULT" CONF AND LABEL
var tagBuilder = async (object = {}) => {
    try {
        // RESULT & CONFIGURATION, FULL RETURN OBJECT 
        var result = {}
        var configuration = {}
        const full = {}

        // GET MANDATORY FLAGS
        var conf = await Conf.findOne({})
        // IF NULL THROW ERROR
        if(!conf){
            throw 'Conf Missing'
        }
        // COMPARE WITH MANDATORY FLAGS WITH OBJECT CONSTRUCTED 
        conf.mandatoryTagKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw `${x} Conf Tag Missing`
            }
        })
        // GET LABEL MANDATORY FLAGS
        var label = await Label.findOne({
            resourceType: object.resourceType
        })
        // IF NULL THROW ERROR
        if(!label){
            throw 'Label Missing'
        }
        // COMPARE WITH OBJECT TAG
        label.mandatoryTagKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw `${x} Label Tag Missing`
            }
        })
        // COMPARE WITH OBJECT CONFIG
        label.mandatoryConfigKeys.filter((x) => {
            const found = Object.keys(object).includes(x)
            // IF MISSING RETURN ERROR
            if(!found){
                throw `${x} Label Conf Missing`
            }
            if(found){
                configuration[x] = object[x]
                delete object[x]
            }
        })
        // FILTER TAG FROM BOTH SOURCES, REMOVES CLUTTER, VERIFY IF ABBR IS SPECIFIED
        // TODO ... PERFORM SAME FOR CONFIGURATION TO ENSURE CLEAN DATA
        // FILTER 
        var set = new Set(conf.mandatoryTagKeys.concat(label.mandatoryTagKeys))
        var filter = Array.from(set)
        for (let i = 0; i < filter.length; i++) {
            const key = filter[i]
            const value = object[key]
            // VERIFY ABBR OF VALUE
            const abbr = await Abbr.findOne({
                elementLabel: value
            })
            if(!abbr){
                throw `${value} Missing Abbr`
            }
            // FIND RELATIONSHIP BY CHILD
            const relationship = await Relationship.find({
                owner: object.connectorId,
                child: value
            })
            // debugging 
            // console.log('relationship =')
            // console.log(relationship)
            // // debugging
            // console.log('object values =')
            // console.log(Object.values(object))

            // FILTER ALL AND TEST RELATIONSHIP BY PARENT 
            relationship.filter((x) => {
                // CHECK PARENT RELATIONSHIP
                // debugging
                // console.log('x =')
                // console.log(x)
                var match = 0 
                if (x.parent.length >= 1){
                    // ITERATE PARENT
                    x.parent.forEach(y => {
                        // IF FOUND VERIFY IF ALLOWED ELSE CONTINUE 
                        if(Object.values(object).indexOf(y) !== -1){
                            match++
                            // NOT ALLOWED
                            if(!x.allow){
                                throw `Relationship Not Allowed ${y}`
                            } 
                            // PROMOTE CHILD TO PARENT STRING VALUE IF KEY MATCH
                            if(x.promote && x.keyMatch){
                                value = x.parent
                            }
                        } else {
                            if(x.arrayMatch){
                                throw `Relationship Missing ${y}`
                            }
                        }
                    })
                }
                // debugging
                // console.log('match =')
                // console.log(match)
                // ARRAY MATCH TRUE COMPARE LENGTH OF PARENT AND MATCH COUNT
                if(x.arrayMatch && x.parent.length !== match){
                    throw `Relationship Missing ${x.parent.join(', ')}`
                }
            })
            // MISSING KEY BETWEEN BOTH CONF AND LABEL, THROW ERROR
            if(object[key] === undefined){
                throw `${filter[i]} Bad Element`
            }
            result[key] = value
        }
        // SUCCESS, RETURN TAG AND CONFIG
        full['tag'] = result
        full['config'] = configuration
        return full
    } catch (e) {
        console.error(e)
        return new Error(e)
    }
}

// LOGICAL NAME BUILDER WILL CALL TWO FUNCTIONS ABOVE BUILD #1 LABEL, #2 NEXT NAME
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
        // debugging
        // console.log('name =')
        // console.log(name)
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

// #1 BUILD LABEL IN SPECIFIC ORDER PROVIDED BY LABEL DOCUMENT 
var buildLabel = async (obj = {}) => {
    try {
        var prefix = []
        var result = {}
        // FIND LABEL BASED ON RESOURCE TYPE
        const label = await Label.findOne({
            resourceType: obj.resourceType
        })
        if(!label){
            throw 'Label not found'
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
        result.maxCount = label.maxCount
        result.keepNumerator = label.keepNumerator
        // debugging
        // console.log('result =')
        // console.log(result)
        // RETURN OBJECT
        return result
    } catch (e) {
        console.error(e)
        throw new Error(e)
    }
}

// #2 VERIFY NEXT AVAILABLE NAME WITHIN NAME SPACE, MAX COUNT AND KEEP NUMERATOR FIELDS WILL TAKE PART IN LOGIC
var nextName = async (name = {}) => {
    try {
        name.prefix = !name.upperCase ? name.prefix.toLowerCase() : name.prefix.toUpperCase()
        name.prefix = !name.keepNumerator ? name.prefix.replace(RegExp(`${name.delimiter}$`), '') : name.prefix
        const re = new RegExp(`^${name.prefix}`)
        // debugging
        // console.log('re =')
        // console.log(re)
        var padding = name.suffix.split('')
        var count = await Name.countDocuments({'fullName': {$regex: re}})
        // debugging
        // console.log('count =')
        // console.log(count)
        if(count >= name.maxCount){
            throw 'Max Count'
        }
        else if (count >= 0){
            if(name.keepNumerator){
                count++
                count = count.toString().split('')
    
                if(count.length <= padding.length){
                    for (let i = 0; i < count.length; i++){
                        padding.pop()
                    }
                    padding = Array.isArray(padding) === true ? padding.join('') : padding
                    count = Array.isArray(count) === true ? count.join('') : count
                } else if (name.suffix === '') {
                    count = Array.isArray(count) === true ? count.join('') : count
                }
            } else {
                count = ''
            }
            return [name.prefix, padding, count]
        }
        throw 'Bad Name'
    } catch (e) {
        console.error(e)
        throw new Error(e)
    }
}

var resourceTypeArray = async (obj) => {
    var result = {}
    var element = null
    
    if (obj.length > 0){
        for (let i = 0; i < obj.length; i++){
            
            // TODO, SEE TAG MODEL EXPLANATION
            // if(obj[i].entry){
            //     element = obj[i].entry
            // } else {
            //     element = obj[i]
            // }
            element = obj[i]

            const rt = element['resourceType']
            if(result[rt] !== undefined){
                result[rt].push(element)
            } 
            else {
                result[rt] = [element]
            }
        }
    }

    return result
}

module.exports = { 
    bodyQuery,
    objDocBuilder,
    tagBuilder,
    logicalNameBuilder, 
    resourceTypeArray
}
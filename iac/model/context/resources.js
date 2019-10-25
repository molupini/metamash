const mongoose = require('mongoose')
const Labels = require('../config/labels')
const Tiers = require('./tiers')
const SecurityRules = require('../config/security')
const validator = require('validator')

const resourcesSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null
    },
    // TODO MAKE RESOURCE TYPE ARRAY FOR MAIN CONFIGURATION 
    resourceType: {
        type: String,
        trim: true,
        uppercase: true, 
        default: 'TMP',
        validate(value){
            if (!value.match(/(ESX|VM|DC|TMP|HPV|CLS|NETW|PHY|NOSQL|SQL|CON|FUNC|BLOB|VPC|API|SMS|MAIL|GRP|USR|NLB|DNS|APP|WEB|WEBVM|DBVM|EC2|DYN|S3|ECS|BEAN|STATE|EBS|RDS|RULE)/)){
                throw new Error('Please provide valid resourceType')
            }
        }
    },
    logicalName: {
        type: String,
        trim: true,
        default: 'linuxBase'
    },
    logicalId: {
        type: String,
        trim: true,
        default: 'NULL'
    },
    userDefined: {
        type: Boolean,
        default: false
    },
    misc: {
    }
}, {
    // timestamps: true
})

resourcesSchema.index({author: 1, logicalName: 1}, {unique: true})
SecurityRules
resourcesSchema.methods.toJSON = function(){
    const resources = this.toObject()
    delete resources.__v
    // delete resources.author
    // delete resources.owner
    // delete resources.logicalId
    // delete resources._id
    // delete resources.misc
    return resources
}

// // TODO RESOURCE CONFIG BASED ON QUERY STRING, EXAMPLE ONLY TO REMOVE
resourcesSchema.methods.resourceConfig = async function (config = {}) {
    try {
        const resource = this
        var misc = {}
        // if(resource.resourceType.match(/(USR|GRP)/)){
        //     // return misc = config === 'isAdmin' ? {'isAdmin': "1"}: {'isAdmin': "0"}
        // }
        return misc
    } catch (e) {
        throw new Error(e)
    }
}

// TODO NOT PERFECT PATTERN MATCH RATHER BE EXPLICIT ===
resourcesSchema.pre('save', async function(next) {
    const resources = this
    if(resources.isNew){
        const object = {}
        var labels = null
        var tier = null
        var ct = null
        var tmp = null
        var template = null
        var ports = []
        var rule = {}

        switch (resources.resourceType) {
            case 'DYN':
                object['hashKey'] = 'LockID'
                resources.misc = object
                break
            case 'AUSR':
                object['isAdmin'] = '1'
                resources.misc = object
                break
            case 'AGRP':
                object['isAdmin'] = '1'
                resources.misc = object
                break
            case 'RUSR':
                object['isAdmin'] = '0'
                resources.misc = object
                break
            case 'RGRP':
                object['isAdmin'] = '0'
                resources.misc = object
                break
            case 'VPC':
                    object['region'] = 'eu-west-1'
                    object['az'] = 'eu-west-1a,eu-west-1b,eu-west-1c'
                    resources.misc = object
                    break
            case 'EC2':
                // TODO VERIFY TMP, SET NULL IF NOT FOUND
                tmp = resources.misc.template
                if(tmp.match(/^(linux|windows)/)){
                    template = await Resources.findOne({
                        resourceType: 'TMP',
                        logicalName: tmp
                    })
                }
                if(tmp.match(/^(ami-)/)){
                    template = await Resources.findOne({
                        resourceType: 'TMP',
                        logicalId: tmp
                    })
                }
                resources.misc.template = !template ? 'NULL' : template.logicalId
                // TODO VERIFY COMPU TIER, SET DEFAULT IF NOT FOUND
                labels = await Labels.findOne({
                    resourceType: resources.resourceType
                })
                tier = await Tiers.findOne({
                    author: labels._id,
                    category: 'compu'
                })
                ct = tier.tier[resources.misc.compuTier]
                resources.misc.compuTier = ct === undefined ? 't2.micro' : ct
                break
            case 'RDS':
                labels = await Labels.findOne({
                    resourceType: resources.resourceType
                })
                tier = await Tiers.findOne({
                    author: labels._id,
                    category: 'compu'
                })
                ct = tier.tier.indexOf([resources.misc.compuTier])
                resources.misc.compuTier = ct === -1 ? 'db.t2.large' : resources.misc.compuTier
                resources.misc.size = resources.misc.size < 5 ? 5 : resources.misc.size
                // ENGINE
                resources.misc.engine = !resources.misc.engine.match(/(mysql|mariadb|mssql|oracle|postgres|aurora)/) ? 'mysql' : resources.misc.engine
                // MYSQL, ENGINE MAJOR/MINOR RELEASE 
                if(resources.misc.engine === 'mysql'){
                    resources.misc.majorRelease = parseInt(resources.misc.majorRelease.split('.')[0] === 5 && parseInt(resources.misc.majorRelease.split('.')[0] > 7)) ? resources.misc.majorRelease : '5.7'
                    resources.misc.minorRelease = parseInt(resources.misc.minorRelease.split('.')[0] <= 19) ? resources.misc.minorRelease : '19'
                }
                // MARIA, ENGINE MAJOR/MINOR RELEASE 
                if(resources.misc.engine === 'mariadb'){
                    resources.misc.majorRelease = (parseInt(resources.misc.majorRelease.split('.')[0]) === 10 && parseInt(resources.misc.majorRelease.split('.')[0] > 1)) ? resources.misc.majorRelease : '10.1'
                    resources.misc.minorRelease = resources.misc.engine.match(/'maria'/) && (parseInt(resources.misc.minorRelease.split('.')[0]) <= 14) ? resources.misc.minorRelease : '14'
                }
                // DB
                resources.misc.dbname = resources.misc.dbname.match(/(default|master|model|temp|)/) ? 'demodb' : resources.misc.dbname
                break
            case 'STATE':
                // TODO 
                console.log('resources =')
                console.log(resources.misc)
                break
            case 'SGRP':
                // TODO IF UNABLE TO THROW ERROR RATHER APPLY DEFAULTS 
                // VALID PORT NUMBER
                if(resources.misc.port){
                    // TODO ARRAY MULTI SEED INTO SECURITY RULES MODEL
                    if(resources.misc.port.match(/(\:)/)){
                        const set = new Set(resources.misc.port.split(':'))
                        console.log(set)
                        var array = Array.from(set)
                        for (let i = 0; i < array.length; i++){
                            const isValid = validator.isPort(array[i])
                            if(isValid){
                                ports.push(array[i])
                            }
                        }
                        resources.misc.port = ports.join(':')
                    } else {
                        if(validator.isPort(resources.misc.port)){
                            // resources.misc.port = resources.misc.port
                            rule.port = resources.misc.port
                        }
                        else {
                            console.error('Please provide a valid port')
                            throw new Error('Please provide a valid port')
                        }
                    }
                }
                // VALID SOURCE
                if(resources.misc.source.match(/\//) && validator.isIP(resources.misc.source.split('/')[0])){
                    resources.misc.source = parseInt(resources.misc.source.split('/')[1]) <= 32 && parseInt(resources.misc.source.split('/')[1]) >= 0 ? resources.misc.source : resources.misc.source.replace(/\d{1,2}$/, /\/32$/)
                    // resources.misc.source = resources.misc.source
                    rule.source = resources.misc.source
                }
                if(resources.misc.source.match(/sg\-/)){
                    rule.source = resources.misc.source
                }
                // VALID DIRECTION INBOUND INGRESS, OUTBOUND EGRESS   
                if(resources.misc.direction.match(/(ingress|egress)/)){
                    // resources.misc.direction = resources.misc.direction
                    rule.direction = resources.misc.direction
                }
                else {
                    console.error('Please provide a valid direction')
                    throw new Error('Please provide a valid direction')
                }
                // VALID FROM/TO RESOURCE
                const re = new RegExp('(SELF|ESX|VM|DC|TMP|HPV|CLS|NETW|PHY|NOSQL|SQL|CON|FUNC|BLOB|VPC|API|SMS|MAIL|GRP|USR|NLB|DNS|APP|WEB|WEBVM|DBVM|EC2|DYN|S3|ECS|BEAN|STATE|EBS|RDS)')
                if(resources.misc.forResource.match(re) && resources.misc.toResource.match(re)){
                    // resources.misc.forResource = resources.misc.forResource
                    // resources.misc.toResource = resources.misc.toResource
                    rule.forResource = resources.misc.forResource
                    rule.toResource = resources.misc.toResource
                }
                else {
                    console.error('Please provide a valid from/to resource')
                    throw new Error('Please provide a valid from/to resource')
                }
                const securityRules = await new SecurityRules({
                    author: resources._id,
                    owner: resources.author,
                    ...rule
                })
                await securityRules.save()
                // debugging
                // console.log('securityRules =')
                // console.log(securityRules)

                break
            case 'TMP':
                if(resources.logicalName.match(/^(linux)/)){
                    resources.logicalId = 'ami-0ce71448843cb18a1'
                    object['operatingSystem'] = "Linux"
                    resources.misc = object
                }
                if(resources.logicalName.match(/^(windows)/)){
                    object['operatingSystem'] = "Windows"
                    resources.misc = object
                }
                break
        // default:
        // break
        }
    }

    if(!resources.isNew && resources.isModified('logicalId') && resources.resourceType === 'SGRP'){
        const securityRules = await SecurityRules.find({
            owner: resources.author
        })
        for (i = 0; i < securityRules.length; i++){
            // FIRST CONDITION RULE TO RESOURCE AND SGRP FOR RESOURCE MATCH, SOURCE BOTH START WITH SG-
            if(securityRules[i].toResource === resources.misc.forResource && (securityRules[i].source.match(/(^sg\-)/) && resources.logicalId.match(/(^sg\-)/))){
                const update = await SecurityRules.findByIdAndUpdate({
                    _id: securityRules[i]._id
                }, {
                    source: resources.logicalId
                })
                // debugging
                // console.log('update =')
                // console.log(update)
            }
        }
    }

    next()
})

resourcesSchema.pre('remove', async function(next){
    const resources = this
    if(resources.resourceType === 'SGRP'){
        await SecurityRules.deleteMany({
            author: resources.id
        })
    }
    next()
})

const Resources = mongoose.model('Resources', resourcesSchema)

module.exports = Resources
const mongoose = require('mongoose')
const Tag = require('./tag')
const Config = require('./config')
const Name = require('../svc/name')

const resourceSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null, 
        ref: 'Deployment'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, 
        ref: 'Connector'
        // default: null
    },
    // TODO MAKE RESOURCE TYPE ARRAY FOR MAIN CONFIGURATION 
    resourceType: {
        type: String,
        trim: true, 
        required: true
    },
    logicalName: {
        type: String,
        trim: true, 
        required: true
    },
    logicalId: {
        type: String,
        trim: true, 
        required: true,
        default: 'null'
    },
    userDefined: {
        type: Boolean,
        default: false
    }
}, {
    // timestamps: true
})

resourceSchema.index({author: 1, logicalName: 1}, {unique: true})

resourceSchema.methods.toJSON = function(){
    const resource = this.toObject()
    delete resource.__v
    return resource
}

// TODO NOT PERFECT PATTERN MATCH RATHER BE EXPLICIT
resourceSchema.pre('save', async function(next) {
    const resource = this

    if(!resource.isNew && resource.isModified('logicalId') && resource.resourceType === 'SGRP'){
        const config = await Config.findOne({
            author: resource.id
        })
        for (i = 0; i < config.length; i++){
            // FIRST CONDITION RULE TO RESOURCE AND SGRP FOR RESOURCE MATCH, SOURCE BOTH START WITH SG-
            if(config[i].toResource === config.forResource && (config[i].source.match(/(^sg\-)/) && resource.logicalId.match(/(^sg\-)/))){
                const update = await Config.findByIdAndUpdate({
                    _id: config[i]._id
                }, {
                    source: resource.logicalId
                })
                // debugging
                console.log('resource, pre save, update =')
                console.log(update)
            }
        }
    }

    next()
})

resourceSchema.pre('remove', async function(next){
    const resource = this
    await Tag.deleteMany({
        owner: resource.id
    })
    await Config.deleteMany({
        owner: resource.id
    })
    // // TODO, RATHER CONTROL VIA GLOBAL SETTING AS CAN PROVIDE UNDESIRED RESULTS 
    // await Name.deleteMany({
    //     author: resource.id
    // })
    next()
})

const Resource = mongoose.model('Resource', resourceSchema)

module.exports = Resource
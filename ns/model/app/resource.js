const mongoose = require('mongoose')
const ResourceSettings = require('./config')

const resourcesSchema = new mongoose.Schema({
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

resourcesSchema.index({author: 1, logicalName: 1}, {unique: true})

resourcesSchema.methods.toJSON = function(){
    const resources = this.toObject()
    delete resources.__v
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

// TODO NOT PERFECT PATTERN MATCH RATHER BE EXPLICIT
resourcesSchema.pre('save', async function(next) {
    const resources = this

    if(!resources.isNew && resources.isModified('logicalId') && resources.resourceType === 'SGRP'){
        const setting = await ResourceSettings.findOne({
            author: resources.id
        })
        for (i = 0; i < setting.length; i++){
            // FIRST CONDITION RULE TO RESOURCE AND SGRP FOR RESOURCE MATCH, SOURCE BOTH START WITH SG-
            if(setting[i].toResource === setting.forResource && (setting[i].source.match(/(^sg\-)/) && resources.logicalId.match(/(^sg\-)/))){
                const update = await ResourceSettings.findByIdAndUpdate({
                    _id: setting[i]._id
                }, {
                    source: resources.logicalId
                })
                // debugging
                console.log('update =')
                console.log(update)
            }
        }
    }

    next()
})

resourcesSchema.pre('remove', async function(next){
    const resources = this
    await ResourceSettings.deleteMany({
        author: resources.id
    })
    next()
})

const Resource = mongoose.model('Resource', resourcesSchema)

module.exports = Resource
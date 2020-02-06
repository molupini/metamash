const mongoose = require('mongoose')
// const Tiers = require('../context/tiers')
const Abbr = require('../svc/abbr')

// Label can't be allocated to a specific connector, like abbr(s), they are company wide. 
const labelSchema = new mongoose.Schema({
    // LABEL CONNECTOR WIDE 
    // MULTI TENANCY, WOULD REQUIRE LABELS ASSIGNED TO CONNECTOR ID 
    // author: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     required: true,
    //     default: null
    // },
    resourceType: {
        type: String,
        trim: true,
        default: 'vpc'
    },
    keyMap: {
        type: Array,
        trim: true,
        default: ['resourceType', 'application', 'environment'],
    },
    stringDelimiter: {
        type: String,
        default: '-',
        validate(value){
            if(!value.match(/^(\.|\:|\-)$|^$/)){
                throw new Error('Please provide supported delimiter')
            }
        }
    },
    union: {
        type: Boolean, 
        default: true
    },
    padding: {
        type: String,
        trim: true,
        default: '000000'
    }, 
    // MAX COUNT, 0 DROP NUMERATOR, OTHERWISE CONTINUE TO VALUE
    maxCount:{
        type: Number, 
        default: 999999
    },
    keepNumerator:{
        type: Boolean, 
        default: true
    },
    // CASE CONVERT
    isUpperCase:{
        type: Boolean,
        default: false
    }, 
    // REQUIRED TAG, ABOVE SVC CONF
    mandatoryTagKeys: {
        type: Array,
        default: []
    },
    // REQUIRED CONFIG
    mandatoryConfigKeys: {
        type: Array,
        default: []
    },
    // STAND ALONE WITHIN A DEPLOYMENT / CART
    standAlone: {
        type: Boolean,
        default: false
    },
    // maxCount WILL ACCOMPLISH SAME RESULT
    // onePerAccount: {
    //     type: Boolean,
    //     default: false
    // }
    // TODO EVAL THE NEED TO HAVE A isUpper FIELD
}, {
    // timestamps: true
})

labelSchema.index({author: 1, resourceType: 1}, {unique: true})

labelSchema.virtual('tiers', {
    ref: 'Tiers',
    localField: '_id',
    foreignField: 'author'
})

labelSchema.methods.toJSON = function(){
    const label = this.toObject()
    // UNCOMMENT BELOW FOR SEEDING OUTPUT FROM GET ALL LABELS
    // delete label._id
    // delete label.author
    // delete label.__v

    return label
}


labelSchema.statics.seedArray = async function (arr = []) {
    try {
        var array = []
        await Label.deleteMany({})

        for (i = 0; i < arr.length; i++){
            const label = await new Label({
                ...arr[i]
            })
            await label.save()
            array.push(label)
            }
        return true
    } catch (e) {
        // console.error(e)
        return false
    }
}

labelSchema.pre('save', async function(next) {
    const label = this
   
    // SAVE LABEL VERIFY RESOURCE
    try {
        // debugging
        // console.log(label) 
        if(label.isNew){

                // // VALID RESOURCE TYPES WITHIN ABBR 
                // // TODO ENSURE RESOURCE TYPE IS MARKED A SVC OR AKA SYSTEM KEY 
                
                const types = await Abbr
                .find({
                    keyLabel: 'resourceType'
                })
                .distinct('elementLabel')

                const keys = await Abbr.find().distinct('keyLabel')

                const idx = types.indexOf(label.resourceType)
                const key = label.keyMap
                const tag = label.mandatoryTagKeys

                if(label.mandatoryTagKeys !== []) {
                    join = keys.concat(key, tag)
                } else {
                    join = keys.concat(key)
                }

                const set = new Set(join)
                // NOT FOUND IN ARRAY
                if(idx < 0){
                    throw {'error': `missing element`}
                }
                // IF SET LARGE THEN POSSIBLE KEYS KEY NOT SPECIFIED 

                if(set.size > keys.length){
                    throw {'error': `missing key`}
                }

        }
        next()
    } catch (e) {
        console.error(e)
        throw (e)
    }

})

const Label = mongoose.model('Label', labelSchema)

module.exports = Label


// if(label.resourceType === 'STATE'){
//     label.mandatoryConfigKeys = ['runAs']
// }
// if(label.resourceType === 'VPC'){
//     label.keyMap = ['resourceType', 'businessEntity', 'environments', 'locations']
//     label.mandatoryTagKeys = ['locations']
// }
// if(label.resourceType === 'EC2'){
//     label.mandatoryConfigKeys = ['count', 'template', 'compuTier', 'perimeters']
//     const tier = await new Tiers({
//         author: label._id,
//         category: "COMPU",
//         tier: ["t2.micro"]
//     })
//     await tier.save()
// }
// if(label.resourceType === 'EBS'){
//     label.keyMap = ['resourceType', 'businessEntity', 'environments', 'application']
//     label.mandatoryConfigKeys = ['path', 'size', ]
//     // 'type', 'delete', 'encrypt'
// }
// if(label.resourceType === 'SGRP'){
//     label.keyMap = ['resourceType', 'businessEntity', 'environments', 'application']
//     label.mandatoryConfigKeys = ['port', 'direction', 'source']
// }
// if(label.resourceType === 'RDS'){
//     label.mandatoryConfigKeys = ['dbname', 'engine', 'majorRelease', 'minorRelease', 'size', 'compuTier']
//     // 'type', 'delete', 'encrypt'
//     const tier = await new Tiers({
//         author: label._id,
//         category: "COMPU",
//         tier: ["db.t2.large"]
//     })
//     await tier.save()
// }
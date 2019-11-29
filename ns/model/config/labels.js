const mongoose = require('mongoose')
const Tiers = require('../../model/context/tiers')

// TODO logicalName used to define VMw vSphere, port group
// TODO ensure document clean up as un-unique 
// TODO Labels can't be allocated to a specific connector, like abbreviation(s), they are company wide. 
const labelsSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null
    },
    // TODO MAKE RESOURCE TYPE ARRAY FOR MAIN CONFIGURATION 
    resourceType: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'VPC',
        validate(value){
            if (!value.match(/(ESX|VM|DC|TMP|HPV|CLS|NETW|PHY|NOSQL|SQL|CON|FUNC|BLOB|VPC|API|SMS|MAIL|GRP|USR|NLB|DNS|APP|WEB|WEBVM|DBVM|EC2|DYN|S3|ECS|ECR|BEAN|STATE|EBS|RDS|RULE|ALB)/)){
                throw new Error('Please provide valid resourceType')
            }
        }
    },
   /*
   TESTING OF ALL RESOURCES BASED ON
   ENDPOINT WILL ENSURE THAT GROUPORG/CLU/BUEN ARE NOT ALLOWED IF ACCOUNT IS IN THE ARRAY
    "account",
    "resourceType",
    "environments",
    "cluster",
    "businessEntity",
    "provider",
    "groupOrganization", 
    "perimeters",
    "aZ",
    "locations"
   */
    keyMap: {
        type: Array,
        trim: true,
        default: ['resourceType', 'businessEntity', 'environments'],
        validate(value){
            value.forEach(element => {Labels
                if(!element.match(/(account|resourceType|environments|cluster|businessEntity|provider|groupOrganization|perimeters|aZ|locations|application)/)){
                    throw new Error('Please provide valid keyMap')
                }
            })
        }
    },
    // exclude: {
    //     type: Array,
    //     trim: true,
    //     default: ['author', 'owner', '_id', 'other', 'v', 'backOfficeEnabled', 'perimeterEnabled', 'primary', 'secondary', 'dr', 'breakoutEnabled', 'breakoutWhiteList', 'backOfficeBlackList', 'perimeterBlackList']
    // },
    // TODO REMOVE NON SUPPORTED DELIMITERS
    stringDelimiter: {
        type: String,
        default: '-',
        validate(value){
            if(!value.match(/^(\s|\.|\:|\;|\,|\-)$|^$/)){
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
    maxCount:{
        type: Number, 
        default: 1, 

    },
    isUpperCase:{
        type: Boolean,
        default: false
    }, 
    mandatoryTagsKeys: {
        type: Array,
        default: []
    },
    mandatoryConfigKeys: {
        type: Array,
        default: []
    }
    // TODO EVAL THE NEED TO HAVE A isUpper FIELD
}, {
    // timestamps: true
})

labelsSchema.index({author: 1, resourceType: 1}, {unique: true})

labelsSchema.virtual('tiers', {
    ref: 'Tiers',
    localField: '_id',
    foreignField: 'author'
})

labelsSchema.methods.toJSON = function(){
    const label = this.toObject()
    return label
}

labelsSchema.pre('save', async function(next) {
    const label = this
    if(label.isNew){
        if(label.resourceType === 'STATE'){
            label.mandatoryConfigKeys = ['runAs']
        }
        if(label.resourceType === 'VPC'){
            label.keyMap = ['resourceType', 'businessEntity', 'environments', 'locations']
            label.mandatoryTagsKeys = ['locations']
        }
        if(label.resourceType === 'EC2'){
            label.mandatoryConfigKeys = ['count', 'template', 'compuTier', 'perimeters']
            // label.mandatoryTagsKeys = ['perimeters']
            const tier = await new Tiers({
                author: label._id,
                category: "COMPU",
                tier: ["t2.micro"]
            })
            await tier.save()
        }
        if(label.resourceType === 'EBS'){
            label.keyMap = ['resourceType', 'businessEntity', 'environments', 'application']
            label.mandatoryConfigKeys = ['path', 'size', ]
            // 'type', 'delete', 'encrypt'
        }
        if(label.resourceType === 'SGRP'){
            label.keyMap = ['resourceType', 'businessEntity', 'environments', 'application']
            label.mandatoryConfigKeys = ['port', 'direction', 'source']
        }
        if(label.resourceType === 'RDS'){
            label.mandatoryConfigKeys = ['dbname', 'engine', 'majorRelease', 'minorRelease', 'size', 'compuTier']
            // 'type', 'delete', 'encrypt'
            const tier = await new Tiers({
                author: label._id,
                category: "COMPU",
                tier: ["db.t2.large"]
            })
            await tier.save()
        }

    }
    next()
})

const Labels = mongoose.model('Labels', labelsSchema)

module.exports = Labels

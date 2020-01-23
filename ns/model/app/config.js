const mongoose = require('mongoose')
const validator = require('validator')
// const Resources = require('../context/resources')

// TODO USE DEFAULTS AS FAR AS POSSIBLE 
const resourceSettingsSchema = new mongoose.Schema({
    // RESOURCE ID
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null
    },
    // DEPLOYMENT ID
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null
    },
    // GENERAL 
    resourceType:{
        type: String,
        trim: true,
        required: true,
        // default: "NULL"
    },
    count:{
        type: Number,
        required: false,
        // default: 0
    },
    template:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    version:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    locations:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    // COMPUTE
    cpu:{
        type: Number,
        required: false,
        // default: 0
    },
    memory:{
        type: Number,
        required: false,
        // default: 0
    },
    compuTier:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    // DAT
    size:{
        type: Number,
        required: false,
        // default: 0
    },
    path:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    isPersistent:{
        type: Boolean,
        required: false,
        // default: false
    },
    // COMMS
    port:{
        type: String,
        trim: true,
        required: false,
        // default: "80",
        validate(value){
            if(!validator.isPort(value)){
                throw new Error('Please provide valid port Number')
            }
        }
    },
    perimeters:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    direction:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    source:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    forResource:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    toResource:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    cidr:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    // DB
    engine:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    majorRelease:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    minorRelease:{
        type: String,
        trim: true,
        required: false,
        // default: "NULL"
    },
    // USER
    isAdmin:{
        type: Number,
        required: false,
        // default: 0
    },
    runAs:{
        type: String,
        trim: true,
        required: false,
        // default: 0
    },
}, {
    // timestamps: true
})

resourceSettingsSchema.methods.toJSON = function(){
    const resourceSettings = this.toObject()
    return resourceSettings
}

const ResourceSettings = mongoose.model('ResourceSettings', resourceSettingsSchema)

module.exports = ResourceSettings
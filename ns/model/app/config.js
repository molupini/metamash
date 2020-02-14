const mongoose = require('mongoose')
const validator = require('validator')
// const Resources = require('../context/resources')

// TODO USE DEFAULTS AS FAR AS POSSIBLE 
const configSchema = new mongoose.Schema({
    // RESOURCE ID
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null, 
        ref: 'Deployment'
    },
    // DEPLOYMENT ID
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, 
        ref: 'Resource'
        // default: null
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
    datastore: {
        type: String,
        trim: true,
        required: false
    },
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
    perimeter:{
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

configSchema.methods.toJSON = function(){
    const config = this.toObject()
    delete config.__v
    // REDUCE CLUTTER 
    delete config.author
    delete config.owner
    delete config.resourceType
    delete config._id
    return config
}

// // TODO VERIFY THAT VALUE WITHIN ABBR MODEL SVC FOLDER, REMOVE TO REMOVE COMPLEXITY WITHIN UTIL NAMES
// defaultsSchema.pre('save', async function(next) {
//     next()
// })

const Config = mongoose.model('Config', configSchema)

module.exports = Config
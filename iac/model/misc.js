
const mongoose = require('mongoose')
const MainConnector = require('./connector')


const miscConfigSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'MainConnector'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'Tenant'
    },
    stringDelimiter: {
        type: String,
        default: '-',
        maxlength: 1, 
        validate(value){
            if(!value.match(/(\.|\-|\_)/)){
                throw new Error('Please provide supported delimiter')
            }
        }
    },
    isolationEnabled: {
        type: Boolean, 
        default: false
    },
    isolationLabel: {
        type: Array, 
        required: false,
        default: ['operatingSystem']
    },
    masterEnabled: {
        type: Boolean, 
        default: false
    },
    masterLabel: {
        type: String, 
        trim: true,
        uppercase: true,
        default: 'MASTER'
    },
    loggingEnabled: {
        type: Boolean, 
        default: false
    },
    loggingLabel: {
        type: String, 
        trim: true,
        uppercase: true,
        default: 'LOGGING'
    },
    auditEnabled: {
        type: Boolean, 
        default: false
    },
    auditLabel: {
        type: String, 
        trim: true,
        uppercase: true,
        default: 'AUDIT'
    },
    billingEnabled: {
        type: Boolean, 
        default: false
    },
    billingLabel: {
        type: String, 
        trim: true,
        uppercase: true,
        default: 'BILLING'
    },
    networkEnabled: {
        type: Boolean, 
        default: false
    },
    networkLabel: {
        type: String, 
        trim: true,
        uppercase: true,
        default: 'NETWORK'
    },
    sharedInfrastructureEnabled: {
        type: Boolean, 
        default: false
    },
    sharedInfrastructureLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: "COMMON-SRV"
    },
    sharedApplicationsEnabled: {
        type: Boolean, 
        default: false
    },
    sharedApplicationsLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: "SHARED-APPS"
    },
    projectEnabled: {
        type: Boolean, 
        default: false
    },
    projectLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: "ST-SB000"
    }
}, {
    // timestamps: true
})

miscConfigSchema.index({owner: 1, author: 1}, {unique: true})

miscConfigSchema.methods.toJSON = function(){
    const miscConfig = this.toObject()
    return miscConfig
}

// TODO - Resolve Issue
/*
    express_1  | TypeError: MainConnector.findOne is not a function
    express_1  |     at Function.miscConfigSchema.statics.seed (/node/app/model/context/misc.js:126:47)
    express_1  |     at model.<anonymous> (/node/app/model/context/misc.js:139:30)
    express_1  |     at callMiddlewareFunction (/node/node_modules/kareem/index.js:474:23)
    express_1  |     at model.next (/node/node_modules/kareem/index.js:58:7)
    express_1  |     at _next (/node/node_modules/kareem/index.js:106:10)
    express_1  |     at process.nextTick (/node/node_modules/kareem/index.js:499:38)
    express_1  |     at process._tickCallback (internal/process/next_tick.js:61:11)

    Doesn't work between .methods on the instance nor .statics on the Model
*/

// Identical issue above

miscConfigSchema.pre('save', async function(next){
    try {
        const misc = this
        // if(!misc.isNew && misc.masterEnabled){
        //     console.log(misc)
        //     // const connector = await MainConnector.find({})
        //     // console.log(connector)
        // }
    } catch (e) {
        console.log(e)
    }
    next()
})


const MiscConfig = mongoose.model('MiscConfig', miscConfigSchema)

module.exports = MiscConfig
const mongoose = require('mongoose')
const MainConnector = require('../connector')

// TODO ensure document clean up as un-unique 
const environmentsSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        unique: true
    },
    disaster_recovery: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'PRD'
    },
    production: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'PRD'
    },
    proof_of_value_pilot: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    },   
    training: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    }, 
    quality_assurance: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    }, 
    pre_production: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    },  
    acceptance: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    }, 
    maintenance: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'QAT'
    }, 
    development: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'DEV'
    },  
    integration: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'DEV'
    },  
    testing: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'DEV'
    },  
    development: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'DEV'
    },  
    proof_of_concept: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'SBX'
    },
    sandbox: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'SBX'
    },
    project:{
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'ST'
    },
    other:{
        type: String,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 5,
        default: 'NULL'
    }
}, {
    // timestamps: true
})

environmentsSchema.methods.toJSON = function(){
    const environments = this.toObject()
    return environments
}

// environmentsSchema.pre('save', async function(next){
//     try {
//         const env = this
//         if(!env.isNew){
//             const connector = await MainConnector.findById(env.author)
//             // console.log(connector)
//         }
//     } catch (e) {
//         console.log(e)
//     }
//     next()
// })


const Environments = mongoose.model('Environments', environmentsSchema)

module.exports = Environments
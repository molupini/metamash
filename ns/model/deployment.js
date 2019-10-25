const mongoose = require('mongoose')
const OrganizationalUnit = require('../model/context/ou')
const Tagging = require('../model/tagging')


const deploymentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Tenant'
    },
    // runAs: {
    //     type: String,
    //     trim: true,
    //     default: null
    // },
    stateDescription: {
        type: String,
        default: 'ready',
        validate(value){
            if(!value.match(/(ready|initComplete|initError|planComplete|planError|planDiff|applyComplete|applyError|destroyComplete|destroyError|fileError|keyError|initDestroy|null)/)){
                throw new Error('Please provide valid state')
            }
        }
    },
    state: {
        type: Number,
        validate(value){
            if(value < -1 || value > 13){
                throw new Error('Please provide valid state')
            }
        }
    }
}, {
    timestamps: true
})

// controlSchema.virtual('virtualMachine', {
//     ref: 'VirtualMachine',
//     localField: 'author',
//     foreignField: '_id'
// })

deploymentSchema.methods.toJSON = function(){
    const deployment = this.toObject()
    delete deployment.__v
    delete deployment.state
    return deployment
}

deploymentSchema.pre('save', async function (next) {
    const deployment = this
    var state = false
    switch (deployment.state) {
        case 0:
            deployment.stateDescription = 'ready'
            break
        case 1:
            deployment.stateDescription = 'initComplete'
            break
        case 2:
            deployment.stateDescription = 'initError'
            break
        case 3:
            deployment.stateDescription = 'planComplete'
            break
        case 4:
            deployment.stateDescription = 'planError'
            break
        case 5:
            deployment.stateDescription = 'planDiff'
            break
        case 6:
            deployment.stateDescription = 'applyComplete'
            state = true
            break
        case 7:
            deployment.stateDescription = 'applyError'
            break
        case 8:
            deployment.stateDescription = 'destroyComplete'
            break
        case 9:
            deployment.stateDescription = 'destroyError'
            break
        case 10:
            deployment.stateDescription = 'fileError'
            break
        case 11:
            deployment.stateDescription = 'keyError'
            break
        case 12:
            deployment.stateDescription = 'initDestroy'
            break
        case 13:
            deployment.stateDescription = 'null'
            break
        default:
            break
    }

    if(!deployment.isNew && deployment.isModified('stateDescription')){
        const ou = await OrganizationalUnit.findById(deployment.author)
        const tagging = await Tagging.findOne({
            author: deployment.id
        })
        if (tagging.entries.application === 'TFSTATE'){
            ou.remoteStateDeploymentId = deployment._id
            ou.remoteStateReadyEnabled = state
        }
        await ou.save()
    }

    next()
})

const Deployments = mongoose.model('Deployments', deploymentSchema)

module.exports = Deployments
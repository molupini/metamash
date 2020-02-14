const mongoose = require('mongoose')


const deploymentSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Connector'
    },
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

deploymentSchema.methods.toJSON = function(){
    const deployment = this.toObject()
    delete deployment.__v
    delete deployment.state
    return deployment
}

deploymentSchema.pre('save', async function (next) {
    const deployment = this
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

    next()
})

const Deployment = mongoose.model('Deployment', deploymentSchema)

module.exports = Deployment
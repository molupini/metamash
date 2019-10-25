const mongoose = require('mongoose')


const configSchema = new mongoose.Schema({
    mandatoryTagsKeys: {
        type: Array,
        default: ["account", "environments", "businessEntity", "cluster", "provider", "groupOrganization", "resourceType", "locations", "network", "perimeter", "application", "deploymentId"],
        validate(value){
            const match = value.filter( x => ['account', 'environment', 'cluster', 'businessEntity', 'provider', 'groupOrganization'].includes(x))
            if(!match){
                throw new Error('Missing mandatory tag default key')
            }
            if(Array.from(new Set(value)).length !== value.length){
                throw new Error('Duplication found')
            }
        }
    },
    coreInfrastructureBuilder: {
        type: Boolean,
        default: true
    },
    pipeBuilder: {
        type: Boolean,
        default: true
    },
    automatedBuilder: {
        type: Boolean,
        default: false
    },
    enableLogging: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

// OTHER EXAMPLES
// "account",
// "environments",
// "businessEntity",
// "cluster",
// "provider",
// "groupOrganization",
// "resourceType",
// "application",
// "deploymentId"

configSchema.methods.toJSON = function(){
    const config = this.toObject()
    return config
}

// defaultsSchema.pre('save', async function(next) {
//     next()
// })

const Configs = mongoose.model('Configs', configSchema)

module.exports = Configs

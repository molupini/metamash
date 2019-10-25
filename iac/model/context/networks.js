const mongoose = require('mongoose')

// TODO logicalName used to define VMw vsphere port group
// TODO ensure document clean up as un-unique 
const networksSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null
    },
    network: {
        type: String,
        trim: true,
        default: 'internal'
    },
    label: {
        type: String,
        trim: true,
        default: 'null'
    }, 
    networkAddress: {
        type: String,
        trim: true,
        default: 'null'
    }
}, {
    // timestamps: true
})

networksSchema.index({author: 1, network: 1}, {unique: true})

networksSchema.methods.toJSON = function(){
    const networks = this.toObject()
    return networks
}


const Networks = mongoose.model('Networks', networksSchema)

module.exports = Networks
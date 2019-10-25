const mongoose = require('mongoose')

// TODO logicalName used to define VMw vsphere port group
// TODO ensure document clean up as un-unique 
const perimeterSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: null,
        ref: 'MainConnector'
    },
    backOfficeEnabled: {
        type: Boolean,
        default: true
    },
    backOfficeLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'BE'
    },
    backOfficeBlackList: {
        type: Array,
        default: ['MASTER']
    },
    perimeterEnabled: {
        type: Boolean,
        default: true
    },
    perimeterLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'FE'
    },
    perimeterBlackList: {
        type: Array,
        default: ['MASTER', 'AUDIT', 'BILLING', 'DEV', 'SBX']
    },
    breakoutEnabled: {
        type: Boolean,
        default: true
    },
    breakoutLabel: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'NULL'
    },
    breakoutWhiteList: {
        type: Array,
        default: ['NETWORK']
    },
    aZ: {
        type: Array,
        default: ['A', 'B', 'C']
    }
}, {
    // timestamps: true
})

// nameSchema.index({author: 1, logicalName: 1}, {unique: true})

perimeterSchema.methods.toJSON = function(){
    const perimeter = this.toObject()
    return perimeter
}

// templateSchema.pre('save', async function(next) {
//     next()
// })

const Perimeters = mongoose.model('Perimeters', perimeterSchema)

module.exports = Perimeters

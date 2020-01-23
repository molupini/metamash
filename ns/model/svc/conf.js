const mongoose = require('mongoose')


const confSchema = new mongoose.Schema({
    mandatoryTagKeys: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
})

confSchema.methods.toJSON = function(){
    const conf = this.toObject()
    return conf
}

// defaultsSchema.pre('save', async function(next) {
//     next()
// })

const Conf = mongoose.model('Conf', confSchema)

module.exports = Conf

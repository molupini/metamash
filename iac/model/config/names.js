const mongoose = require('mongoose')

const nameSchema = new mongoose.Schema({
    // owner: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     // required: true,
    //     default: null,
    //     ref: 'Account'
    // },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        ref: 'Resource'
    },
    fullName: {
        type: String,
        minlength: 3,
        maxlength: 65,
        default: 'null',
        // uppercase: true, 
        unique: true
    }
}, {
    timestamps: true
})

nameSchema.methods.toJSON = function(){
    const names = this.toObject()
    return names
}

const Names = mongoose.model('Names', nameSchema)

module.exports = Names
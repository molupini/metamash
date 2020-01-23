const mongoose = require('mongoose')
// const VirtualMachine = require('../model/vm')

const taggingSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'author'
    },
    // owner: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     // required: true,
    //     default: null, 
    //     ref: 'owner'
    // },
    entries: {
    }
})

taggingSchema.methods.toJSON = function(){
    const tagging = this.toObject()
    return tagging
}

taggingSchema.pre('save', async function (next){
    try {
        const tagging = this
        const object = {}
        if(tagging.isNew){
            const key = Object.keys(tagging.entries)
            for(let i = 0; i < key.length; i++){
                const value = tagging.entries[key[i]]
                if(value){
                    object[key[i]] = value
                }
            }
            tagging.entries = object
        }
    } catch (e) {
        console.error(e)
    }
    next()
})

const Tagging = mongoose.model('Tagging', taggingSchema)

module.exports = Tagging
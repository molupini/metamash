const mongoose = require('mongoose')
// const VirtualMachine = require('../model/vm')

const tagSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Deployment'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null, 
        ref: 'Resource'
    },
    entry: {
    }
})

tagSchema.methods.toJSON = function(){
    const tag = this.toObject()
    return tag
}

tagSchema.pre('save', async function (next){
    try {
        const tag = this
        const object = {}
        if(tag.isNew){
            const key = Object.keys(tag.entry)
            for(let i = 0; i < key.length; i++){
                const value = tag.entry[key[i]]
                if(value){
                    object[key[i]] = value
                }
            }
            tag.entry = object
        }
    } catch (e) {
        console.error(e)
    }
    next()
})

const Tag = mongoose.model('Tag', tagSchema)

module.exports = Tag
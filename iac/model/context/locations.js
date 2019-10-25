const mongoose = require('mongoose')

// TODO ensure document clean up as un-unique 
const locationsSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null,
        unique: true
    },
    primary: {
        type: String,
        // lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 32,
        default: 'eu-west-1'
    },
    primarySynonym: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 4,
        default: 'NULL'
    },
    secondary: {
        type: String,
        // lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 32,
        default: 'NULL'
    },
    secondarySynonym: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 4,
        default: 'NULL'
    },
    dr: {
        type: String,
        // lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 32,
        default: 'NULL'
    },
    drSynonym: {
        type: String,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 4,
        default: 'NULL'
    }
}, {
    // timestamps: true
})


locationsSchema.methods.toJSON = function(){
    const locationMap = this.toObject()
    return locationMap
}

locationsSchema.statics.shortCode = (string) => {
    // console.log(string)
    const split = string.split(/\W/)
    const first = split.length > 1 && split[0].length <= 2 ? split[0] : `${split[0].split('')[0]}${split[0].split('')[1]}`
    const last = string.match(/\d/) ? string.match(/\d/)[0] : 1
    // console.log(first, last)
    return `${first}${last}`
}

locationsSchema.pre('save', async function(next) {
    const location = this
    if(location.isNew){
        if(location.primary.length > 4){
            const short = await Locations.shortCode(location.primary)
            // console.log(short)
            location.primarySynonym = short
        }
        if(location.secondary.length > 4){
            const short = await Locations.shortCode(location.secondary)
            // console.log(short)
            location.secondarySynonym = short
        }
        if(location.dr.length > 4){
            const short = await Locations.shortCode(location.dr)
            // console.log(short)
            location.drSynonym = short
        }
        // console.log(location)
    }
 
    next()
})

const Locations = mongoose.model('Locations', locationsSchema)

module.exports = Locations
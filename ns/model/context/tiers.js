const mongoose = require('mongoose')

// TODO ensure document clean up as un-unique 
const tiersSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        default: null
    },
    category:{
        type: String,
        uppercase: true,
        trim: true,
        required: true,
        default: 'COMPU',
        validate(value){
            if(!value.match(/(COMPU|STOR|APP)/)){
                throw new Error('Please provide valid tier')
            }
        }
    },
    tier: {
        type: Array,
        default: []
    }
}, {
    // timestamps: true
})

tiersSchema.index({author: 1, tier: 1}, {unique: true})

tiersSchema.methods.toJSON = function(){
    const tiers = this.toObject()
    return tiers
}


const Tiers = mongoose.model('Tiers', tiersSchema)

module.exports = Tiers
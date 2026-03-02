const mongoose = require('mongoose');

const CoachSchema = new mongoose.Schema({
    coachName: {
        type: String, 
        trim: true,
        required: true,
    },

    coachSurname: {
        type: String,
        trim: true,
        required: true
    },

    coachGender: {
        type: String,
        trim: true,
        required: true,
    },

    coachBirthDate: {
        type: Date,
        trim: true,
        default: null,
    },

    coachStudents: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
        }],
        default: [],
    },

    coachChatId: {
        type: String,
        trim: true,
        unique: true,
        required: true,
    },

    coachExercises: {
    type: [{
        name: { type: String, required: true },
        category: { type: String, required: true },
    }],
    default: [],
    },

    coachTrainings: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Training',
        }],
        default: [],
    },

    coachApplications: {
        type: [{}],
        default: [],
    }
},

{timestamps: true})

const Coach = mongoose.model('Coach', CoachSchema);

module.exports = Coach;
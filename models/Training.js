const mongoose = require('mongoose');

const TrainingSchema = new mongoose.Schema({
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true,
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },

    exercises: [{
        name: { type: String, required: true },
        sets: {
            type: [{
                reps: {
                    type: Number,
                    required: true,
                },
                weight: {
                    type: Number,
                    required: true,
                }
            }],
            required: true
        }
    }],

    addedBy: {
        type: String,
        enum: ['coach', 'student'],
        default: 'coach',
    }
},

{timestamps: true})

const Training = mongoose.model('Training', TrainingSchema);

module.exports = Training;
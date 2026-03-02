const defaultExercises = require('../data/defaultExercises');
const Coach = require('../models/Coach');
const mongoose = require('mongoose');

async function seedCoachExercises() {
    const coaches = await Coach.find({ 'coachExercises.0': { $exists: false } });
    for (const coach of coaches) {
        coach.coachExercises = defaultExercises.flatMap(cat =>
            cat.exercises.map(name => ({ name, category: cat.category }))
        );
        await coach.save();
    }
}

module.exports = {
    seedCoachExercises
}
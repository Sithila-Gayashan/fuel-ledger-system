const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    fuelTypes: [{
        name: { type: String, required: true },
        nozzles: [{ type: String }],
        unitPrice: { type: Number }
    }],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
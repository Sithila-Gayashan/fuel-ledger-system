const mongoose = require('mongoose');

const fuelEntrySchema = new mongoose.Schema({
    fuelType: { type: String, required: true }, // Petrol 92, Diesel etc.
    startReading: { type: Number, required: true },
    endReading: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalSales: { type: Number }, 
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FuelEntry', fuelEntrySchema);
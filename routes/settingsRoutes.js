const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            // Default settings
            settings = await Settings.create({
                fuelTypes: [
                    { name: 'Petrol 92', nozzles: ['Nozzle 01', 'Nozzle 02'], unitPrice: 370 },
                    { name: 'Petrol 95', nozzles: ['Nozzle 03', 'Nozzle 04'], unitPrice: 400 },
                    { name: 'Diesel', nozzles: ['Nozzle 05', 'Nozzle 06'], unitPrice: 360 },
                    { name: 'Super Diesel', nozzles: ['Nozzle 07', 'Nozzle 08'], unitPrice: 390 }
                ]
            });
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const settings = await Settings.findOneAndUpdate(
            {},
            { ...req.body, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
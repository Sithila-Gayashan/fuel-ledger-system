const express = require('express');
const router = express.Router();
const FuelEntry = require('../models/FuelEntry');


router.post('/add', async (req, res) => {
    console.log("Request Body Received:", req.body);
    try {
        const { fuelType, startReading, endReading, unitPrice } = req.body;
        
        
        const totalSales = (endReading - startReading) * unitPrice;

        const newEntry = new FuelEntry({
            fuelType,
            startReading,
            endReading,
            unitPrice,
            totalSales
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


router.get('/all', async (req, res) => {
    try {
        const entries = await FuelEntry.find().sort({ date: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.get('/summary', async (req, res) => {
    try {
        const summary = await FuelEntry.aggregate([
            {
                $group: {
                    _id: "$fuelType",
                    totalLiters: { $sum: { $subtract: ["$endReading", "$startReading"] } },
                    totalEarnings: { $sum: "$totalSales" },
                    entryCount: { $sum: 1 }
                }
            }
        ]);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedEntry = await FuelEntry.findByIdAndDelete(req.params.id);
        
        if (!deletedEntry) {
            return res.status(404).json({ message: "Entry not found" });
        }
        
        res.json({ 
            message: "Entry Deleted Successfully",
            deletedId: req.params.id 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
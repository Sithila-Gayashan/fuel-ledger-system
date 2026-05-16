const express = require('express');
const router = express.Router();
const FuelEntry = require('../models/FuelEntry');

// Add new fuel entry
router.post('/add', async (req, res) => {
    try {
        const { 
            employee, fuelType, pumpNozzle, startReading, endReading, 
            isRollover, unitPrice, cash, cardInvoices, vouchers, cashCollections 
        } = req.body;
        
        // Duplicate Invoice Check 
        if (cardInvoices && cardInvoices.length > 0) {
            for (let inv of cardInvoices) {
                const exists = await FuelEntry.findOne({ 'cardInvoices.invoiceNo': inv.invoiceNo });
                if (exists) {
                    return res.status(400).json({ error: `Invoice Number ${inv.invoiceNo} already exists!` });
                }
            }
        }

        let liters = 0;
        const start = Number(startReading);
        const end = Number(endReading);

        if (isRollover) {
            const METER_MAX = 1000000; 
            liters = (METER_MAX - start) + end;
        } else {
            liters = end - start;
        }

        const totalSales = liters * Number(unitPrice);
        const totalCardAmount = cardInvoices ? cardInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0) : 0;
        const totalCashFromCollections = cashCollections ? cashCollections.reduce((sum, col) => sum + Number(col.amount), 0) : 0;
        const totalCollected = totalCashFromCollections + totalCardAmount + Number(vouchers);
        const shortage = totalCollected - totalSales;

        const newEntry = new FuelEntry({
            employee, 
            fuelType, 
            pumpNozzle, 
            startReading, 
            endReading, 
            isRollover,
            unitPrice, 
            totalSales, 
            cash: totalCashFromCollections,
            cashCollections: cashCollections || [],
            cardInvoices: cardInvoices || [], 
            totalCardAmount, 
            vouchers, 
            shortage
        });

        const savedEntry = await newEntry.save();
        res.status(201).json(savedEntry);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get last reading
router.get('/last-reading/:fuelType/:pumpNozzle', async (req, res) => {
    try {
        const { fuelType, pumpNozzle } = req.params;

        const lastEntry = await FuelEntry.findOne({ 
            fuelType: fuelType, 
            pumpNozzle: pumpNozzle 
        }).sort({ _id: -1 });

        if (lastEntry) {
            res.json({ lastReading: lastEntry.endReading });
        } else {
            res.json({ lastReading: 0 }); 
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all reports
router.get('/all', async (req, res) => {
    try {
        const entries = await FuelEntry.find().sort({ date: -1 });
        res.json(entries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Report
router.put('/update/:id', async (req, res) => {
    try {
        const { 
            employee, fuelType, pumpNozzle, startReading, endReading, 
            isRollover, unitPrice, cash, cardInvoices, vouchers, cashCollections 
        } = req.body;
        
        // Duplicate Invoice Check 
        if (cardInvoices && cardInvoices.length > 0) {
            for (let inv of cardInvoices) {
                const exists = await FuelEntry.findOne({ 
                    'cardInvoices.invoiceNo': inv.invoiceNo,
                    _id: { $ne: req.params.id }
                });
                if (exists) return res.status(400).json({ error: `Invoice Number ${inv.invoiceNo} already exists!` });
            }
        }

        let liters = isRollover ? (1000000 - Number(startReading)) + Number(endReading) : Number(endReading) - Number(startReading);
        const totalSales = liters * Number(unitPrice);
        const totalCardAmount = cardInvoices ? cardInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0) : 0;
        const totalCashFromCollections = cashCollections ? cashCollections.reduce((sum, col) => sum + Number(col.amount), 0) : 0;
        const shortage = (totalCashFromCollections + totalCardAmount + Number(vouchers)) - totalSales;

        const updatedEntry = await FuelEntry.findByIdAndUpdate(
            req.params.id,
            { 
                employee, 
                fuelType, 
                pumpNozzle, 
                startReading, 
                endReading, 
                isRollover, 
                unitPrice, 
                totalSales, 
                cash: totalCashFromCollections,
                cashCollections: cashCollections || [],
                cardInvoices: cardInvoices || [], 
                totalCardAmount, 
                vouchers, 
                shortage 
            },
            { new: true }
        );
        res.json(updatedEntry);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Summary
router.get('/summary', async (req, res) => {
    try {
        const summary = await FuelEntry.aggregate([
            {
                $group: {
                    _id: "$fuelType",
                    totalEarnings: { $sum: "$totalSales" },
                    totalShortage: { $sum: "$shortage" },
                    entryCount: { $sum: 1 }
                }
            }
        ]);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete record
router.delete('/delete/:id', async (req, res) => {
    try {
        await FuelEntry.findByIdAndDelete(req.params.id);
        res.json({ message: "Record deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
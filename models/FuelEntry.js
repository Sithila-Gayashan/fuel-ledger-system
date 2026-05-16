const mongoose = require('mongoose');

const fuelEntrySchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    employee: { type: String, required: true },
    fuelType: { type: String, required: true },
    pumpNozzle: { type: String, required: true }, 
    startReading: { type: Number, required: true },
    endReading: { type: Number, required: true },
    isRollover: { type: Boolean, default: false }, 
    unitPrice: { type: Number, required: true },
    totalSales: { type: Number, required: true },
    cash: { type: Number, default: 0 },
    cashCollections: [{ 
        id: { type: Number },
        time: { type: String },
        amount: { type: Number, required: true },
        receivedBy: { type: String, default: 'Cashier' }
    }],
    cardInvoices: [{
        invoiceNo: { type: String, required: true },
        amount: { type: Number, required: true }
    }],
    totalCardAmount: { type: Number, default: 0 },
    vouchers: { type: Number, default: 0 },
    shortage: { type: Number, default: 0 }
});

module.exports = mongoose.model('FuelEntry', fuelEntrySchema);
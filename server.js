const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json()); 


app.get('/', (req, res) => {
    res.send('Fuel Ledger System Backend is Running!');
});


app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB database connection established successfully"))
    .catch(err => console.log("MongoDB connection error: ", err));
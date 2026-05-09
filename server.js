const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json()); 



//Database Connection
console.log("Connecting to MongoDB..."); 
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB database connection established successfully");
    })
    .catch(err => {
        console.log("MongoDB connection error: ", err);
    });

app.use('/api/fuel', require('./routes/fuelRoutes'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/fuel', require('./routes/fuelRoutes'));

app.get('/', (req, res) => {
    res.send('Fuel Ledger System Backend is Running!');
});


app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
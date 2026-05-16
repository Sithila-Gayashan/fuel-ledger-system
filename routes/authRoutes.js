const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');


router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        res.json({ message: "Login successful", user: { id: user._id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add this temporary route to create a default admin
router.get('/setup-default', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: 'admin' });
        if (!existingUser) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newUser = new User({ username: 'admin', password: hashedPassword });
            await newUser.save();
            res.json({ message: "Default admin user created: admin/admin123" });
        } else {
            res.json({ message: "Admin user already exists" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Multer Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'explore_india',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        public_id: (req, file) => 'place-' + Date.now()
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('./')); 
app.use('/uploads', express.static('uploads')); 

// GET all places
app.get('/api/places', (req, res) => {
    db.all("SELECT * FROM places", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST - Add or Update Place
app.post('/api/places', upload.single('image'), (req, res) => {
    const { name, category, description, rating, reviews_count, location, nearest_station, nearest_airport, isEdit } = req.body;
    
    // image_url will now be the secure URL from Cloudinary if a file was uploaded
    let image_url = req.body.image_url;
    if (req.file) {
        image_url = req.file.path; // Cloudinary returns the full URL in req.file.path
    }

    db.get("SELECT * FROM places WHERE name = ?", [name], (err, existingPlace) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const shouldUpdate = isEdit === 'true' || 
                           !existingPlace || 
                           (parseFloat(rating) > existingPlace.rating) || 
                           (parseInt(reviews_count) > existingPlace.reviews_count);

        if (existingPlace) {
            if (shouldUpdate) {
                const sql = `UPDATE places SET 
                    category = ?, description = ?, rating = ?, reviews_count = ?, 
                    location = ?, nearest_station = ?, nearest_airport = ?, image_url = ?
                    WHERE name = ?`;
                const params = [category, description, rating, reviews_count, location, nearest_station, nearest_airport, image_url || existingPlace.image_url, name];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ message: "Update successful", id: existingPlace.id, image_url });
                });
            } else {
                res.json({ message: "Existing data is of higher quality. No update performed." });
            }
        } else {
            const sql = `INSERT INTO places (name, category, description, rating, reviews_count, location, nearest_station, nearest_airport, image_url)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [name, category, description, rating, reviews_count, location, nearest_station, nearest_airport, image_url];
            
            db.run(sql, params, function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: "New place added", id: this.lastID, image_url });
            });
        }
    });
});

// DELETE a place
app.delete('/api/places/:name', (req, res) => {
    const name = req.params.name;
    db.run("DELETE FROM places WHERE name = ?", name, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Deleted", changes: this.changes });
    });
});

// POST - Bulk Import
app.post('/api/import', (req, res) => {
    const places = req.body;
    if (!Array.isArray(places)) {
        res.status(400).json({ error: "Invalid data format. Expected an array." });
        return;
    }

    const stmt = db.prepare(`INSERT OR REPLACE INTO places (name, category, description, rating, reviews_count, location, nearest_station, nearest_airport, image_url)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        places.forEach(p => {
            stmt.run([p.name, p.category, p.description, p.rating, p.reviews_count, p.location, p.nearest_station, p.nearest_airport, p.image_url]);
        });
        db.run("COMMIT", (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ message: `Successfully imported ${places.length} places.` });
            }
        });
    });
    stmt.finalize();
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

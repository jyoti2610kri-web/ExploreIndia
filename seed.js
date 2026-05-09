const db = require('./database');
const fs = require('fs');

const seedData = () => {
    db.get("SELECT COUNT(*) AS count FROM places", [], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        if (row.count === 0) {
            console.log("Seeding database with initial data...");
            const data = JSON.parse(fs.readFileSync('./places.json', 'utf8'));

            const stmt = db.prepare(`INSERT INTO places 
                (name, category, description, rating, reviews_count, location, nearest_station, nearest_airport, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            data.forEach(place => {
                stmt.run(
                    place.name,
                    place.category || "Monument",
                    place.history || place.desc,
                    place.rating || 4.5,
                    place.reviews || 0,
                    place.location,
                    "Unknown Station", // Placeholder
                    "Unknown Airport", // Placeholder
                    place.image
                );
            });
            stmt.finalize();
            console.log("Database seeded successfully.");
        } else {
            console.log("Database already has data. Skipping seed.");
        }
    });
};

seedData();

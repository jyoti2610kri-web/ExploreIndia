let editMode = false;
let editName = null;
let places = [];

const API_URL = "/api/places";

// Load data from server
async function loadFromServer() {
    try {
        const response = await fetch(API_URL);
        places = await response.json();
        loadCards(places);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Call on startup
loadFromServer();

// Toggle between URL and File input
function toggleImgInput(type) {
    const urlInput = document.getElementById("image_url");
    const fileInput = document.getElementById("image_file");
    
    if (type === 'url') {
        urlInput.style.display = "inline-block";
        fileInput.style.display = "none";
    } else {
        urlInput.style.display = "none";
        fileInput.style.display = "inline-block";
    }
}

// Load cards into the grid
function loadCards(data) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    if (data.length === 0) {
        grid.innerHTML = "<p>No results found 😢</p>";
        return;
    }

    data.forEach(place => {
        const card = document.createElement("div");
        card.className = "card";

        // Handle image path (local vs external)
        let imgSrc = place.image_url;
        // Use relative path for local uploads
        if (imgSrc && imgSrc.startsWith('/uploads/')) {
            // Already a relative path in the DB if using my updated logic, 
            // but ensuring it stays relative.
        }

        card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='tourist.png'">
            <div class="category-tag">${place.category}</div>
            <h3>${place.name}</h3>
            <p>⭐ ${place.rating} (${place.reviews_count || 0})</p>
            <p>📍 ${place.location}</p>
            <p class="card-desc">${place.description ? place.description.substring(0, 60) + '...' : ''}</p>
            <div class="card-btns">
                <button onclick="openDetails('${place.name}')">View</button>
                <button onclick="editPlace('${place.name}')">Edit</button>
                <button class="delete-btn" onclick="deletePlace('${place.name}')">Delete</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Add or Update Place
async function addNewPlace() {
    const name = document.getElementById("name").value;
    const location = document.getElementById("location").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const rating = parseFloat(document.getElementById("rating").value) || 0;
    const reviews_count = parseInt(document.getElementById("reviews").value) || 0;
    const nearest_station = document.getElementById("station").value;
    const nearest_airport = document.getElementById("airport").value;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('rating', rating);
    formData.append('reviews_count', reviews_count);
    formData.append('nearest_station', nearest_station);
    formData.append('nearest_airport', nearest_airport);
    formData.append('isEdit', editMode);

    const imageFile = document.getElementById("image_file").files[0];
    const imageUrl = document.getElementById("image_url").value;

    if (imageFile) {
        formData.append('image', imageFile);
    } else {
        formData.append('image_url', imageUrl);
    }

    if (!name || !location) {
        alert("Name and Location are required!");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData // No Content-Type header needed for FormData
        });
        const result = await response.json();
        alert(result.message);
        
        clearForm();
        loadFromServer();
    } catch (error) {
        alert("Error saving place");
    }
}

function clearForm() {
    document.getElementById("name").value = "";
    document.getElementById("location").value = "";
    document.getElementById("description").value = "";
    document.getElementById("rating").value = "";
    document.getElementById("reviews").value = "";
    document.getElementById("station").value = "";
    document.getElementById("airport").value = "";
    document.getElementById("image_url").value = "";
    document.getElementById("image_file").value = "";
    editMode = false;
    editName = null;
    document.getElementById("form-title").innerText = "Add / Edit Place";
}

// Delete place
async function deletePlace(name) {
    if (!confirm(`Delete ${name}?`)) return;

    try {
        const response = await fetch(`${API_URL}/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        loadFromServer();
    } catch (error) {
        alert("Error deleting place");
    }
}

// Edit place - fill form
function editPlace(name) {
    const place = places.find(p => p.name === name);
    if (!place) return;

    document.getElementById("name").value = place.name;
    document.getElementById("location").value = place.location;
    document.getElementById("category").value = place.category;
    document.getElementById("description").value = place.description;
    document.getElementById("rating").value = place.rating;
    document.getElementById("reviews").value = place.reviews_count;
    document.getElementById("station").value = place.nearest_station;
    document.getElementById("airport").value = place.nearest_airport;
    
    // Set image source preference
    if (place.image_url && place.image_url.startsWith('/uploads/')) {
        document.querySelector('input[value="file"]').checked = true;
        toggleImgInput('file');
    } else {
        document.querySelector('input[value="url"]').checked = true;
        toggleImgInput('url');
        document.getElementById("image_url").value = place.image_url;
    }

    document.getElementById("form-title").innerText = "Editing: " + place.name;
    editMode = true;
    editName = name;
    window.scrollTo(0, 0);
}

// Search and Filter logic
function filterPlaces() {
    const searchValue = document.getElementById("search").value.toLowerCase();
    const categoryValue = document.getElementById("category-filter").value;

    const filtered = places.filter(place => {
        const matchesSearch = place.name.toLowerCase().includes(searchValue) || 
                              place.location.toLowerCase().includes(searchValue);
        const matchesCategory = categoryValue === "" || place.category === categoryValue;
        return matchesSearch && matchesCategory;
    });

    loadCards(filtered);
}

document.getElementById("search").addEventListener("input", filterPlaces);
document.getElementById("category-filter").addEventListener("change", filterPlaces);

// Details View
function openDetails(name) {
    const place = places.find(p => p.name === name);
    if (!place) return;

    const details = document.getElementById("details");
    document.getElementById("app").style.display = "none";
    details.classList.remove("hidden");

    const mapLink = `https://www.google.com/maps/dir/${encodeURIComponent(place.nearest_station || 'Railway Station')}/${encodeURIComponent(place.name)}`;

    let imgSrc = place.image_url;
    // Relative path for local uploads
    if (imgSrc && imgSrc.startsWith('/uploads/')) {
        // already relative
    }

    details.innerHTML = `
        <div class="details-content">
            <h1>${place.name}</h1>
            <div class="details-layout">
                <img src="${imgSrc}" onerror="this.src='tourist.png'">
                <div class="info-pane">
                    <p><b>📍 Location:</b> ${place.location}</p>
                    <p><b>🏷️ Category:</b> ${place.category}</p>
                    <p><b>⭐ Rating:</b> ${place.rating} (${place.reviews_count} reviews)</p>
                    <p><b>🚉 Nearest Station:</b> ${place.nearest_station || 'N/A'}</p>
                    <p><b>✈️ Nearest Airport:</b> ${place.nearest_airport || 'N/A'}</p>
                    
                    <h3>📜 About</h3>
                    <p>${place.description || 'No description available.'}</p>
                    
                    <div class="action-btns">
                        <a href="${mapLink}" target="_blank" class="directions-btn">🧭 Get Directions</a>
                        <button onclick="goBack()" class="back-btn">⬅ Back to Home</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function goBack() {
    document.getElementById("details").classList.add("hidden");
    document.getElementById("app").style.display = "block";
}

// Sync Placeholder
function goToSync() {
    document.getElementById("app").style.display = "none";
    document.getElementById("sync").classList.remove("hidden");
}

function goHome() {
    document.getElementById("sync").classList.add("hidden");
    document.getElementById("app").style.display = "block";
}

// Export data to JSON file
function exportData() {
    if (places.length === 0) {
        alert("No data to export!");
        return;
    }
    const dataStr = JSON.stringify(places, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "explore_india_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Import data from JSON file
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) {
                alert("Invalid JSON format. Expected an array of places.");
                return;
            }

            const response = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(importedData)
            });

            const result = await response.json();
            alert(result.message);
            loadFromServer();
            goHome();
        } catch (error) {
            console.error("Import error:", error);
            alert("Error importing data. Check file format.");
        }
    };
    reader.readAsText(file);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Registration Failed!', err));
    });
}

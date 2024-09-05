let map;
let userMarker;
let cabMarkers = [];
let userLocation = [0, 0];
let availableCabs = [];
let bookedCab = null;
let movingCabMarker = null;
const maxArrivalTime = 10 * 60 * 1000; // Max time in milliseconds (10 minutes)
const updateInterval = 1000; // Update interval in milliseconds (1 second)
let cabMoveInterval;

const userIcon = L.icon({
    iconUrl: 'https://www.svgrepo.com/show/127575/location-sign.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const cabIcons = {
    standard: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/89/89131.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    premium: L.icon({
        iconUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx9u4Aw6RNZJqyNR9gf-6lt2ZNHE6xVdzMBA&s',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    luxury: L.icon({
        iconUrl: 'https://as2.ftcdn.net/v2/jpg/03/57/86/17/1000_F_357861742_0ycq05AlTg01BImRlSQiKuMsOG7RgUKW.jpg',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
};

const ratesPerKm = {
    standard: 10,
    premium: 20,
    luxury: 30
};

function initMap(position) {
    userLocation = [position.coords.latitude, position.coords.longitude];
    console.log("User location:", userLocation); 

    
    map = L.map('map').setView(userLocation, 15);

    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    
    userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map)
        .bindPopup("You are here")
        .openPopup();

    
    const nearbyCabs = generateNearbyCabs(userLocation);
    availableCabs = nearbyCabs;
    addCabMarkers(nearbyCabs);
}
function generateNearbyCabs(userLocation) {
    const nearbyCabs = [];
    for (let i = 0; i < 5; i++) {
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lngOffset = (Math.random() - 0.5) * 0.01;
        const type = ['standard', 'premium', 'luxury'][Math.floor(Math.random() * 3)];
        nearbyCabs.push({
            lat: userLocation[0] + latOffset,
            lng: userLocation[1] + lngOffset,
            type: type,
            rate: ratesPerKm[type]
        });
    }
    return nearbyCabs;
}

function addCabMarkers(cabs) {
    cabMarkers.forEach(marker => map.removeLayer(marker));
    cabMarkers = [];
    cabs.forEach(cab => {
        const icon = cabIcons[cab.type] || cabIcons.standard;
        const marker = L.marker([cab.lat, cab.lng], { icon: icon })
            .addTo(map)
            .bindPopup(`<b>Type:</b> ${cab.type}<br><b>Rate:</b> ${cab.rate} INR/km`)
            .openPopup();
        cabMarkers.push(marker);
    });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

function geocodeAddress(address, callback) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                callback([parseFloat(result.lat), parseFloat(result.lon)]);
            } else {
                alert("Address not found. Please enter a valid location.");
            }
        });
}

function showBookingModal() {
    document.getElementById("bookingModal").style.display = "block";
}

function closeModal() {
    document.getElementById("bookingModal").style.display = "none";
}

function calculateFare() {
    const destination = document.getElementById("destination").value;
    const cabType = document.getElementById("cabType").value;

    if (!destination) {
        alert("Please enter a destination.");
        return;
    }

    geocodeAddress(destination, function(destinationCoords) {
        const distance = calculateDistance(userLocation[0], userLocation[1], destinationCoords[0], destinationCoords[1]);
        const ratePerKm = ratesPerKm[cabType];
        const fare = distance * ratePerKm;
        document.getElementById("fareDisplay").innerText = `Estimated Fare: ${fare.toFixed(2)} INR`;

        let comparisonHTML = "<h3>Compare Cab Options:</h3>";
        for (let type in ratesPerKm) {
            const typeFare = distance * ratesPerKm[type];
            comparisonHTML += `<p>${type.charAt(0).toUpperCase() + type.slice(1)}: ${typeFare.toFixed(2)} INR</p>`;
        }
        document.getElementById("comparisonTable").innerHTML = comparisonHTML;
    });
}

function bookCab() {

    let generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();


    const destination = document.getElementById("destination").value;
    const cabType = document.getElementById("cabType").value;

    if (!destination || !cabType) {
        alert("Please fill out all fields.");
        return;
    }

    geocodeAddress(destination, function(destinationCoords) {
        const selectedCab = availableCabs.find(cab => cab.type === cabType);

        if (selectedCab) {
            // Clear previous moving cab marker
            if (movingCabMarker) {
                map.removeLayer(movingCabMarker);
                clearInterval(cabMoveInterval); // Clear the movement interval if it exists
            }

            // Set up the moving cab marker
            movingCabMarker = L.marker([selectedCab.lat, selectedCab.lng], {
                icon: cabIcons[cabType] || cabIcons.standard
            }).addTo(map);

            // Calculate distance and time
            const distanceToUser = calculateDistance(selectedCab.lat, selectedCab.lng, userLocation[0], userLocation[1]);
            const timeToDestination = Math.min(maxArrivalTime, distanceToUser * 60 * 1000 / (distanceToUser / maxArrivalTime)); 
            const steps = timeToDestination / updateInterval;
            const stepLat = (userLocation[0] - selectedCab.lat) / steps;
            const stepLng = (userLocation[1] - selectedCab.lng) / steps;
            let currentStep = 0;

            function moveCab() {
                if (currentStep < steps) {
                    selectedCab.lat += stepLat;
                    selectedCab.lng += stepLng;
                    movingCabMarker.setLatLng([selectedCab.lat, selectedCab.lng]);
                    map.panTo([selectedCab.lat, selectedCab.lng]); // Optional: Center the map on the moving cab
                    currentStep++;
                } else {
                    map.removeLayer(movingCabMarker);
                    movingCabMarker = null;
                    userMarker.bindPopup(`Cab arrived!`).openPopup();
                }
            }

            cabMoveInterval = setInterval(moveCab, updateInterval);

            // Update the user marker popup with estimated arrival time
            const estimatedArrivalTime = Math.ceil(timeToDestination / (1000 * 60)); // Convert milliseconds to minutes
            userMarker.bindPopup(`Cab on the way! Estimated arrival time: ${estimatedArrivalTime} minutes`).openPopup();

            const routePolyline = L.polyline([[selectedCab.lat, selectedCab.lng], userLocation], {
                color: 'blue',
                weight: 3,
                opacity: 0.5,
                dashArray: '5,10'
            }).addTo(map);

            // Show booking confirmation
            const bookingDetails = `
                <h3>Booking Confirmed</h3>
                <p>Cab Type: ${cabType.charAt(0).toUpperCase() + cabType.slice(1)}</p>
                <p>Estimated Fare: ${calculateFareForCab(cabType, destination).toFixed(2)} INR</p>
                <p>Estimated Arrival Time: ${estimatedArrivalTime} minutes</p>
            `;
            document.getElementById("bookingDetails").innerHTML = bookingDetails;
            document.getElementById("bookingConfirmation").style.display = "block";

            closeModal();
        } else {
            alert("No available cabs of selected type.");
        }
    });
}

function calculateFareForCab(cabType, destination) {
    const distance = calculateDistance(userLocation[0], userLocation[1], destination[0], destination[1]);
    const ratePerKm = ratesPerKm[cabType];
    return distance * ratePerKm;
}

document.getElementById("calculateFareBtn").addEventListener("click", calculateFare);
document.getElementById("bookCabBtn").addEventListener("click", bookCab);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("openModalBtn").addEventListener("click", showBookingModal);

// Get user's location and initialize map
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(initMap, function() {
        alert("Geolocation is not supported or permission denied.");
    });
} else {
    alert("Geolocation is not supported by this browser.");
}
// hamburger.js
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const menuContent = document.getElementById('menuContent');

    hamburgerBtn.addEventListener('click', function() {
        menuContent.classList.toggle('show-menu');
    });
});

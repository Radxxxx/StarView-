const canvas = document.getElementById('skyCanvas');
const ctx = canvas.getContext('2d');
const starInfo = document.getElementById('starInfo');

let stars = [];
let constellationLines = [];

// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawSky();
}
window.addEventListener('resize', resizeCanvas);

// === Utility: RA/Dec → screen coordinates ===
function project(ra, dec, width, height) {
  // RA: 0–24h → 0–width
  const x = (ra / 24) * width;
  // Dec: +90 top → -90 bottom
  const y = ((90 - dec) / 180) * height;
  return { x, y };
}

// === Fetch constellation line data ===
fetch('data/constellations.json')
  .then(res => res.json())
  .then(data => {
    constellationLines = data.lines;
  })
  .catch(err => console.warn("Constellation data not loaded:", err));

// === Fetch star/planet data from AstronomyAPI ===
async function fetchStars(lat, lon) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://api.astronomyapi.com/api/v2/bodies/positions?latitude=${lat}&longitude=${lon}&elevation=0&from_date=${today}&to_date=${today}&time=00:00:00`;

  const res = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + btoa('YOUR_APP_ID:YOUR_APP_SECRET') // 👈 replace!
    }
  });

  const data = await res.json();
  stars = [];

  // Loop through returned bodies (planets, sun, moon, etc.)
  Object.entries(data.data.table.rows).forEach(([i, row]) => {
    const body = row.entry;
    const ra = body.position.equatorial.rightAscension.hours;
    const dec = body.position.equatorial.declination.degrees;

    const coords = project(ra, dec, canvas.width, canvas.height);

    stars.push({
      id: i,
      x: coords.x,
      y: coords.y,
      mag: 1, // no magnitude from API → placeholder
      name: body.name
    });
  });

  drawSky();
}

// === Draw function ===
function drawSky() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  // Draw stars
  stars.forEach(star => {
    const radius = Math.max(1, 4 - (star.mag || 2));
    ctx.beginPath();
    ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw constellation lines
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  constellationLines.forEach(([i, j]) => {
    const starA = stars.find(s => s.id == i);
    const starB = stars.find(s => s.id == j);
    if (starA && starB) {
      ctx.beginPath();
      ctx.moveTo(starA.x, starA.y);
      ctx.lineTo(starB.x, starB.y);
      ctx.stroke();
    }
  });
}

// === Click interactivity ===
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (let star of stars) {
    const dx = mouseX - star.x;
    const dy = mouseY - star.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 10) {
      starInfo.style.display = 'block';
      starInfo.innerText = `⭐ ${star.name}`;
      return;
    }
  }
  starInfo.style.display = 'none';
});

// === Geolocation + start ===
navigator.geolocation.getCurrentPosition(
  (pos) => {
    fetchStars(pos.coords.latitude, pos.coords.longitude);
  },
  () => {
    console.warn("Geolocation denied. Using default coords.");
    fetchStars(37.7749, -122.4194); // San Francisco
  }
);

resizeCanvas();

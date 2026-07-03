const oneDay = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(12, 0, 0, 0);

let inventory = [
  { id: 1, name: "Tomatoes", qty: "3", expiry: futureDate(2), culture: "Indian", damaged: false },
  { id: 2, name: "Spinach", qty: "1 bag", expiry: futureDate(1), culture: "Mediterranean", damaged: false },
  { id: 3, name: "Yogurt", qty: "1 tub", expiry: futureDate(6), culture: "Indian", damaged: false },
  { id: 4, name: "Bell pepper", qty: "1", expiry: futureDate(-1), culture: "Mexican", damaged: true }
];

const basics = ["Rice", "Milk", "Eggs", "Tomatoes", "Spinach", "Onion", "Bell pepper", "Yogurt"];
const foodIdeas = [
  "Tomato basil shakshuka",
  "Chickpea curry bowl",
  "Miso vegetable rice",
  "Spiced lentil stew",
  "Veggie fajita bowl",
  "Mediterranean grain salad",
  "Creamy tomato pasta",
  "Coconut vegetable korma",
  "Roasted pepper pizza",
  "Citrus quinoa bowl",
  "Garden veggie stir-fry",
  "Fresh cucumber yogurt salad"
];

const recipes = {
  Indian: [
    ["Garden masala bowl", ["Saute {items} with cumin, turmeric, ginger, and garlic.", "Add lentils, yogurt, or coconut milk and simmer until cozy.", "Serve with rice or flatbread and lemon."]],
    ["Quick sabzi wrap", ["Cook {items} with coriander, cumin, and a little chili.", "Mash lightly with yogurt or chutney.", "Wrap in flatbread or serve with rice."]],
    ["Vegetable biryani skillet", ["Toast spices with {items}.", "Fold in rice and a splash of water.", "Cover until fragrant, then finish with herbs."]]
  ],
  Western: [
    ["Roasted veggie skillet", ["Roast or pan-fry {items} with garlic and rosemary.", "Add potatoes, pasta, or grains.", "Finish with herbs, lemon, and cheese if available."]],
    ["Creamy comfort soup", ["Simmer {items} with broth, onion, and thyme.", "Blend part of the soup or add milk.", "Serve with toast or crackers."]],
    ["Loaded pantry toast", ["Cook {items} until soft and golden.", "Pile onto toast with eggs, beans, or cheese.", "Add pepper and a bright sauce."]]
  ],
  Mexican: [
    ["Market taco bowl", ["Char {items} with cumin and chili powder.", "Add rice, beans, or tortillas.", "Top with lime, salsa, and yogurt crema."]],
    ["Warm salsa skillet", ["Cook {items} with smoked paprika.", "Add rice, beans, and salsa.", "Simmer until saucy and bright."]],
    ["Veggie quesadilla stack", ["Brown {items} in a pan.", "Layer with beans or cheese in tortillas.", "Toast until crisp and serve with salsa."]]
  ],
  Italian: [
    ["Rustic vegetable pasta", ["Roast {items} with olive oil and Italian herbs.", "Toss with pasta, tomato, and pasta water.", "Finish with basil and cheese."]],
    ["Garden risotto rice", ["Cook {items} with garlic and olive oil.", "Stir in rice and warm broth.", "Finish creamy with herbs."]],
    ["Warm focaccia salad", ["Roast {items} with tomato and oregano.", "Toss with toasted bread pieces.", "Add olive oil, vinegar, and cheese."]]
  ],
  Japanese: [
    ["Miso rice plate", ["Saute {items} with ginger and soy.", "Add miso and rice or noodles.", "Top with sesame and citrus."]],
    ["Soy ginger noodle bowl", ["Cook {items} quickly with ginger.", "Toss with noodles, soy, and miso.", "Finish with sesame or scallions."]],
    ["Crispy veggie pancake", ["Chop {items} small.", "Mix with egg, flour, and water.", "Pan-fry until crisp and finish with sauce."]]
  ],
  Mediterranean: [
    ["Lemon herb bowl", ["Cook {items} with olive oil, lemon, and oregano.", "Add chickpeas, rice, or couscous.", "Finish with yogurt sauce and herbs."]],
    ["Warm mezze plate", ["Roast {items} with paprika and garlic.", "Serve with hummus, pita, or rice.", "Add lemon and cucumber."]],
    ["Tomato couscous pan", ["Cook {items} with tomato and oregano.", "Stir in couscous or rice.", "Top with yogurt or olives."]]
  ]
};

let basket = [];
let pending = [];
let selectedCulture = "Indian";
let lastIdeas = [];
let lastRecipe = "";
let cameraStream = null;
let saveStreak = 3;

function tapPulse() {
  if (navigator.vibrate) navigator.vibrate(12);
}

function futureDate(days) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalize(text) {
  return text.trim().toLowerCase();
}

function expiryDays(item) {
  return Math.ceil((new Date(`${item.expiry}T12:00:00`) - today) / oneDay);
}

function statusFor(item) {
  const days = expiryDays(item);
  if (item.damaged) return ["Damaged", "risk"];
  if (days < 0) return ["Expired", "risk"];
  if (days <= 3) return [`${days} day${days === 1 ? "" : "s"}`, "risk"];
  return ["Good", "ok"];
}

function missingItems() {
  const usable = new Set(inventory.filter((item) => !item.damaged && expiryDays(item) >= 0).map((item) => normalize(item.name)));
  return basics.filter((item) => !usable.has(normalize(item)));
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function renderStats() {
  document.querySelector("#homeCount").textContent = inventory.filter((item) => !item.damaged && expiryDays(item) >= 0).length;
  document.querySelector("#soonCount").textContent = inventory.filter((item) => item.damaged || expiryDays(item) <= 3).length;
  document.querySelector("#gapCount").textContent = missingItems().length;
  document.querySelector("#streakCount").textContent = saveStreak;
}

function renderSaveMove() {
  const target = inventory
    .filter((item) => !item.damaged && expiryDays(item) >= 0)
    .sort((a, b) => expiryDays(a) - expiryDays(b))[0];
  const title = document.querySelector("#saveMoveTitle");
  const text = document.querySelector("#saveMoveText");
  if (!target) {
    title.textContent = "Your kitchen is calm";
    text.textContent = "No urgent food needs rescuing right now.";
    return;
  }
  const days = expiryDays(target);
  title.textContent = `Rescue ${target.name.toLowerCase()} first`;
  text.textContent = days <= 1
    ? `${target.name} is the hero tonight. Turn it into dinner before it slips away.`
    : `${target.name} has ${days} days left. Make it the star of your next craving.`;
}

function renderHomeItems() {
  const list = document.querySelector("#homeItems");
  list.innerHTML = "";
  inventory.forEach((item) => {
    const [label, className] = statusFor(item);
    const row = document.createElement("article");
    row.className = `row${item.damaged || expiryDays(item) <= 3 ? " is-urgent" : ""}`;
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <p class="meta">${item.qty} - expires ${item.expiry}</p>
      </div>
      <div class="row-actions">
        <span class="pill ${className}">${label}</span>
        <button class="mini-btn" data-damage="${item.id}" type="button">${item.damaged ? "Ok" : "Damage"}</button>
        <button class="mini-btn" data-remove="${item.id}" type="button">Remove</button>
      </div>
    `;
    list.append(row);
  });

  list.querySelectorAll("[data-damage]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = inventory.find((entry) => entry.id === Number(button.dataset.damage));
      tapPulse();
      item.damaged = !item.damaged;
      renderAll();
    });
  });

  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      tapPulse();
      inventory = inventory.filter((entry) => entry.id !== Number(button.dataset.remove));
      renderAll();
    });
  });
}

function renderBuyList() {
  const list = document.querySelector("#buyList");
  const missing = missingItems();
  list.innerHTML = missing.length ? "" : `<p class="meta">No grocery gaps today.</p>`;
  missing.forEach((name) => {
    const row = document.createElement("article");
    row.className = "row";
    row.innerHTML = `
      <div>
        <strong>${name}</strong>
        <p class="meta">Missing, expired, or damaged.</p>
      </div>
      <button class="mini-btn" data-buy="${name}" type="button">Add</button>
    `;
    list.append(row);
  });

  list.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      addItem(button.dataset.buy, "1", futureDate(7), selectedCulture);
    });
  });
}

function addItem(name, qty, expiry, culture) {
  inventory.push({ id: Date.now() + Math.floor(Math.random() * 1000), name, qty, expiry, culture, damaged: false });
  saveStreak += 1;
  renderAll();
  showToast(`${name} saved at home.`);
}
      // Ensure a minimum resolution for OCR by scaling canvas to ~1500px width
      const minWidth = 1500;
      let ocrCanvas = canvas;
      if (canvas.width < minWidth) {
        ocrCanvas = document.createElement('canvas');
        const scale = minWidth / canvas.width;
        ocrCanvas.width = Math.round(canvas.width * scale);
        ocrCanvas.height = Math.round(canvas.height * scale);
        const octx = ocrCanvas.getContext('2d');
        octx.imageSmoothingEnabled = true;
        octx.drawImage(canvas, 0, 0, ocrCanvas.width, ocrCanvas.height);
      }
      // Tesseract.js expects a URL/dataURI or canvas; pass canvas directly
      const result = await Tesseract.recognize(ocrCanvas, 'eng', {
        logger: (m) => { /* optional logging */ },
        // tuning parameters
        tessedit_pageseg_mode: 6, // Assume a uniform block of text
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:$%\-()/'
      });
  return items.slice().sort(() => Math.random() - 0.5);
}

function renderIdeas() {
  const grid = document.querySelector("#ideaGrid");
  const candidates = shuffle(foodIdeas).filter((idea) => !lastIdeas.includes(idea));
  const ideas = (candidates.length >= 6 ? candidates : shuffle(foodIdeas)).slice(0, 6);
  lastIdeas = ideas;
  grid.innerHTML = "";
  ideas.forEach((idea) => {
    const button = document.createElement("button");
    button.className = "idea";
    button.type = "button";
    button.textContent = idea;
    button.addEventListener("click", () => {
      tapPulse();
      if (!basket.includes(idea)) basket.push(idea);
      renderBasket();
      showToast("Added to craving basket.");
    });
    grid.append(button);
  });
}

function renderBasket() {
  const list = document.querySelector("#basketList");
  list.innerHTML = basket.length ? "" : `<p class="meta">Pick cravings to build a recipe.</p>`;
  basket.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "row";
    row.innerHTML = `<strong>${item}</strong><button class="mini-btn" data-basket="${index}" type="button">Remove</button>`;
    list.append(row);
  });
  list.querySelectorAll("[data-basket]").forEach((button) => {
    button.addEventListener("click", () => {
      basket.splice(Number(button.dataset.basket), 1);
      renderBasket();
    });
  });
}

function formatItems(items) {
  if (!items.length) return "fresh ingredients";
  const short = items.slice(0, 3).map((item) => item.toLowerCase());
  if (short.length === 1) return short[0];
  return `${short.slice(0, -1).join(", ")} and ${short[short.length - 1]}`;
}

function renderRecipe() {
  const options = recipes[selectedCulture] || recipes.Western;
  tapPulse();
  let recipe = options[Math.floor(Math.random() * options.length)];
  while (options.length > 1 && `${selectedCulture}:${recipe[0]}` === lastRecipe) {
    recipe = options[Math.floor(Math.random() * options.length)];
  }
  lastRecipe = `${selectedCulture}:${recipe[0]}`;

  const items = basket.length ? basket : inventory.filter((item) => !item.damaged && expiryDays(item) >= 0).map((item) => item.name).slice(0, 3);
  const ingredientText = formatItems(items);
  document.querySelector("#recipeName").textContent = `${recipe[0]}${items.length ? ` with ${ingredientText}` : ""}`;
  document.querySelector("#recipeIntro").textContent = `A ${selectedCulture} idea made for what you are craving and saving.`;
  document.querySelector("#recipeSteps").innerHTML = recipe[1].map((step) => `<li>${step.replace("{items}", ingredientText)}</li>`).join("");
}

function parseReceipt() {
  const text = document.querySelector("#receiptText").value.trim();
  const date = futureDate(7);
  pending = text.split(/\n+/).map((line) => {
    const parts = line.trim().split(/\s+/);
    const quantityIndex = parts.findIndex((part) => /\d/.test(part));
    return {
      name: quantityIndex >= 0 ? parts.slice(0, quantityIndex).join(" ") : parts.join(" "),
      qty: quantityIndex >= 0 ? parts.slice(quantityIndex).join(" ") : "1",
      expiry: date,
      culture: selectedCulture
    };
  }).filter((item) => item.name);
  renderPending();
}

function renderPending() {
  const list = document.querySelector("#reviewList");
  list.innerHTML = pending.length ? "" : `<p class="meta">No new groceries waiting.</p>`;
  pending.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "row";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <p class="meta">${item.qty} - use around ${item.expiry}</p>
      </div>
      <div class="row-actions">
        <button class="mini-btn" data-approve="${index}" type="button">Approve</button>
        <button class="mini-btn" data-reject="${index}" type="button">Skip</button>
      </div>
    `;
    list.append(row);
  });

  list.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = pending.splice(Number(button.dataset.approve), 1)[0];
      addItem(item.name, item.qty, item.expiry, item.culture);
      renderPending();
    });
  });

  list.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => {
      pending.splice(Number(button.dataset.reject), 1);
      renderPending();
    });
  });
}

function switchScreen(id) {
  tapPulse();
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.toggle("is-active", screen.id === id));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.screen === id));
  const titles = { home: "Home items", scan: "Camera scanner", crave: "Pick cravings", cook: "Cook something cozy" };
  document.querySelector("#screenTitle").textContent = titles[id];
}

function setCameraState(open) {
  document.querySelector("#openCameraBtn").disabled = open;
  document.querySelector("#captureBtn").disabled = !open;
  document.querySelector("#closeCameraBtn").disabled = !open;
  document.querySelector("#cameraPreview").hidden = !open;
  document.querySelector("#cameraPlaceholder").hidden = open;
  const ocrBtn = document.querySelector("#ocrBtn");
  if (ocrBtn) ocrBtn.disabled = !open;
  const torchBtn = document.querySelector("#torchBtn");
  if (torchBtn) torchBtn.disabled = !open;
}

async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Camera is not supported in this browser.");
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    const preview = document.querySelector("#cameraPreview");
    preview.srcObject = cameraStream;
    setCameraState(true);
    await preview.play();
    showToast("Camera opened.");
    ensureOverlay();
  } catch {
    showToast("Camera permission was blocked.");
  }
}

function closeCamera() {
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  const preview = document.querySelector("#cameraPreview");
  preview.pause();
  preview.srcObject = null;
  setCameraState(false);
}

function captureReceipt() {
  if (!cameraStream) {
    showToast("Open the camera first.");
    return;
  }
  const preview = document.querySelector("#cameraPreview");
  const canvas = document.querySelector("#receiptCanvas");
  canvas.width = preview.videoWidth || 1280;
  canvas.height = preview.videoHeight || 720;
  canvas.getContext("2d").drawImage(preview, 0, 0, canvas.width, canvas.height);
  showToast("Receipt captured. Review the text before saving.");
  // Run preprocessing + OCR automatically after capture
  showOverlayForAdjustment();
}

document.querySelector("#ocrBtn")?.addEventListener("click", () => preprocessAndOcr());
document.querySelector("#torchBtn")?.addEventListener("click", () => toggleTorch());
document.querySelector("#applyAdjustBtn")?.addEventListener("click", () => applyAdjustmentsAndOcr());
document.querySelector("#testOcrBtn")?.addEventListener("click", () => testOcrSample());

async function preprocessAndOcr() {
  const canvas = document.querySelector("#receiptCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  // Ensure we have image data
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // convert to grayscale
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // luminance
    gray[j] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }

  // Apply simple local contrast (tile-based equalization)
  const tileSize = 64;
  for (let ty = 0; ty < canvas.height; ty += tileSize) {
    for (let tx = 0; tx < canvas.width; tx += tileSize) {
      const hist = new Uint32Array(256);
      const w = Math.min(tileSize, canvas.width - tx);
      const h = Math.min(tileSize, canvas.height - ty);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          hist[gray[(ty + y) * canvas.width + (tx + x)]]++;
        }
      }
      let cdfMin = 0;
      let found = false;
      for (let k = 0; k < 256; k++) {
        if (hist[k] && !found) { cdfMin = hist[k]; found = true; }
      }
      let cdf = 0;
      const npix = w * h;
      const lut = new Uint8ClampedArray(256);
      for (let k = 0; k < 256; k++) {
        cdf += hist[k];
        lut[k] = Math.round((cdf - cdfMin) / (npix - cdfMin || 1) * 255);
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          gray[(ty + y) * canvas.width + (tx + x)] = lut[gray[(ty + y) * canvas.width + (tx + x)]];
        }
      }
    }
  }

  // Otsu threshold
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  // apply threshold and write back to imageData
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const v = gray[j] >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  showToast("Running OCR...");
  try {
    // Tesseract.js expects a URL/dataURI or canvas; pass canvas directly
    // Try a more tuned recognize call; keep it simple to remain compatible
    const result = await Tesseract.recognize(canvas, 'eng', { logger: (m) => { /* optional logging */ } });
    const text = result?.data?.text || '';
    document.querySelector('#receiptText').value = text.trim() || document.querySelector('#receiptText').value;
    showToast('OCR complete. Review/edit text before saving.');
  } catch (e) {
    showToast('OCR failed. Try better lighting or a clearer photo.');
  }
}

function ensureOverlay() {
  const overlay = document.querySelector('#cameraOverlay');
  const preview = document.querySelector('#cameraPreview');
  if (!overlay || !preview) return;
  overlay.classList.remove('hidden');
  // match overlay size to video element
  const rect = preview.getBoundingClientRect();
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

function showOverlayForAdjustment() {
  const overlay = document.querySelector('#cameraOverlay');
  const canvas = document.querySelector('#receiptCanvas');
  if (!overlay || !canvas) return;
  overlay.classList.remove('hidden');
  const crop = document.querySelector('#cropRect');
  crop.style.display = 'block';
  crop.style.left = '10%';
  crop.style.top = '10%';
  crop.style.width = '80%';
  crop.style.height = '80%';
  // show rotate slider
  document.querySelector('#rotateSlider').value = '0';
}

function toggleTorch() {
  if (!cameraStream) return showToast('Camera not open');
  const track = cameraStream.getVideoTracks()[0];
  const capabilities = track.getCapabilities && track.getCapabilities();
  if (!capabilities || !capabilities.torch) return showToast('Torch not supported on this device');
  const settings = track.getSettings();
  const currentlyOn = settings.torch || false;
  track.applyConstraints({ advanced: [{ torch: !currentlyOn }] }).then(() => {
    showToast(`Torch ${!currentlyOn ? 'on' : 'off'}`);
  }).catch(() => showToast('Unable to toggle torch'));
}

function applyAdjustmentsAndOcr() {
  const canvas = document.querySelector('#receiptCanvas');
  const preview = document.querySelector('#cameraPreview');
  if (!canvas || !preview) return;
  const ctx = canvas.getContext('2d');
  // get crop rect in percentage and rotation
  const crop = document.querySelector('#cropRect');
  const previewRect = preview.getBoundingClientRect();
  const cRect = crop.getBoundingClientRect();
  const sx = Math.max(0, Math.floor((cRect.left - previewRect.left) / previewRect.width * canvas.width));
  const sy = Math.max(0, Math.floor((cRect.top - previewRect.top) / previewRect.height * canvas.height));
  const sw = Math.max(1, Math.floor(cRect.width / previewRect.width * canvas.width));
  const sh = Math.max(1, Math.floor(cRect.height / previewRect.height * canvas.height));
  const angle = parseFloat(document.querySelector('#rotateSlider').value || '0') * Math.PI / 180;
  // create temp canvas to apply crop+rotate
  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const tctx = tmp.getContext('2d');
  tctx.save();
  tctx.translate(sw / 2, sh / 2);
  tctx.rotate(angle);
  tctx.drawImage(canvas, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  tctx.restore();
  // copy back to main canvas
  canvas.width = tmp.width;
  canvas.height = tmp.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  document.querySelector('#cameraOverlay').classList.add('hidden');
  preprocessAndOcr();
}

async function testOcrSample() {
  // load sample image from workspace if present
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'receipt-sample.jpg';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.querySelector('#receiptCanvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    showToast('Sample loaded. Running OCR...');
    await preprocessAndOcr();
  } catch (e) {
    showToast('Sample not found. Put receipt-sample.jpg in the workspace root.');
  }
}

function renderAll() {
  renderStats();
  renderSaveMove();
  renderHomeItems();
  renderBuyList();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchScreen(button.dataset.screen));
});

document.querySelector("#quickScanBtn").addEventListener("click", () => {
  switchScreen("scan");
  openCamera();
});

document.querySelector("#scanNowBtn").addEventListener("click", () => switchScreen("scan"));
document.querySelector("#saveMoveBtn").addEventListener("click", () => {
  switchScreen("cook");
  renderRecipe();
});
document.querySelector("#cookNowBtn").addEventListener("click", () => {
  switchScreen("cook");
  renderRecipe();
});

document.querySelector("#mobileAddForm").addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(
    document.querySelector("#mobileItemName").value,
    document.querySelector("#mobileItemQty").value,
    document.querySelector("#mobileItemDate").value,
    selectedCulture
  );
  event.currentTarget.reset();
});

document.querySelector("#addSampleBtn").addEventListener("click", () => addItem("Onion", "2", futureDate(8), selectedCulture));
document.querySelector("#refreshIdeasBtn").addEventListener("click", renderIdeas);
document.querySelector("#makeRecipeBtn").addEventListener("click", () => {
  switchScreen("cook");
  renderRecipe();
});
document.querySelector("#anotherRecipeBtn").addEventListener("click", renderRecipe);
document.querySelector("#clearBasketBtn").addEventListener("click", () => {
  basket = [];
  renderBasket();
  renderRecipe();
  showToast("Cravings cleared.");
});
document.querySelector("#parseReceiptBtn").addEventListener("click", parseReceipt);
document.querySelector("#openCameraBtn").addEventListener("click", openCamera);
document.querySelector("#captureBtn").addEventListener("click", captureReceipt);
document.querySelector("#closeCameraBtn").addEventListener("click", closeCamera);
document.querySelector("#receiptImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) showToast(`${file.name} added. Review receipt text.`);
});

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((entry) => entry.classList.toggle("is-selected", entry === button));
    selectedCulture = button.dataset.culture;
    renderRecipe();
  });
});

renderAll();
renderIdeas();
renderBasket();
renderPending();
renderRecipe();

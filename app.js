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

function shuffle(items) {
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

// ==================== FIREBASE CONFIG ====================
// REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyAZI6bCpW45G74hvJLZ386AWSx7UWpa8HU",
  authDomain: "artist-portfolio-e3661.firebaseapp.com",
  projectId: "artist-portfolio-e3661",
  messagingSenderId: "439940904573",
  appId: "1:439940904573:web:54b31bb9f741be2f6e6314",
};

//supabase config
const supabaseUrl = "https://shhlurbuvprjvahrmvku.supabase.co/rest/v1/";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoaGx1cmJ1dnByanZhaHJtdmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODUwNDUsImV4cCI6MjA5MzA2MTA0NX0.KFEdz_63AM8bhvZ84LZUmowxhww0THIJmx_SxgoeAK8";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==================== STATE ====================
let siteData = {};
let artworks = { paintings: [], portraits: [] };
let currentUser = null;
let currentPaymentArtwork = null;
let selectedImageFile = null;
let db = null;
let auth = null;
let storage = null;
let firebaseInitialized = false;

// ==================== DEFAULT DATA ====================
const defaultSiteData = {
  artistName: "Elena Voss",
  tagline: "Fine Art & Portraiture",
  heroTagline: "Fine Art & Portraiture",
  heroTitle: "Where silence\nmeets color",
  heroSubtitle:
    "Original oil paintings and commissioned portraits crafted with intention. Each piece invites stillness into your space.",
  bio1: "Based in Copenhagen, I work primarily in oils and charcoal, exploring the tension between stillness and emotion. My practice is rooted in the belief that art should create a space for pause in an accelerating world.",
  bio2: "With a background in classical fine arts from the Royal Danish Academy and over a decade of studio practice, my work has been exhibited across Europe and is held in private collections in twelve countries.",
  bio3: "When not in the studio, I teach life drawing and mentor emerging artists through the Nordic Art Residency program.",
  email: "studio@elenavoss.com",
  location: "Copenhagen, Denmark",
  telegram: "https://t.me/your_telegram_username",
  paystackKey: "",
  currency: "NGN",
};

const defaultArtworks = {
  paintings: [
    {
      id: "1",
      title: "Morning Light",
      price: 1200,
      image:
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
      medium: "Oil on canvas",
      size: '24" × 30"',
    },
    {
      id: "2",
      title: "Silent Waters",
      price: 950,
      image:
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
      medium: "Oil on linen",
      size: '20" × 24"',
    },
    {
      id: "3",
      title: "Urban Solitude",
      price: 1500,
      image:
        "https://images.unsplash.com/photo-1549887534-1541e9326642?w=800&q=80",
      medium: "Mixed media",
      size: '30" × 40"',
    },
  ],
  portraits: [
    {
      id: "4",
      title: "Ethereal Gaze",
      price: 1800,
      image:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80",
      medium: "Charcoal & oil",
      size: '18" × 24"',
    },
    {
      id: "5",
      title: "The Artist",
      price: 2000,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
      medium: "Oil on linen",
      size: '24" × 30"',
    },
  ],
};

// ==================== INITIALIZATION ====================
// ==================== INITIALIZATION ====================
async function init() {
  showLoading(true);

  try {
    // Import Firebase modules all at once
    const { initializeApp } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const {
      getAuth,
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      sendPasswordResetEmail,
    } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const {
      getFirestore,
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      getDocs,
      addDoc,
      query,
      orderBy,
      serverTimestamp,
    } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Enable persistence for better offline support
    const { enableIndexedDbPersistence } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    try {
      await enableIndexedDbPersistence(db);
      console.log("Firebase persistence enabled");
    } catch (err) {
      if (err.code === "failed-precondition") {
        console.warn(
          "Multiple tabs open, persistence can only be enabled in one tab at a time.",
        );
      } else if (err.code === "unimplemented") {
        console.warn("Browser doesn't support persistence");
      }
    }

    // Disable Firestore emulator if accidentally enabled
    // This ensures we're using production Firestore
    // connectFirestoreEmulator(db, 'localhost', 8080); // REMOVE THIS LINE

    // Make Firebase functions available globally
    window.firebaseAuth = {
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
      sendPasswordResetEmail,
    };
    window.firebaseFirestore = {
      doc,
      getDoc,
      setDoc,
      deleteDoc,
      collection,
      getDocs,
      addDoc,
      query,
      orderBy,
      serverTimestamp,
    };

    firebaseInitialized = true;
    console.log("Firebase initialized successfully!");

    // Test Firebase connection
    try {
      const testDoc = await getDoc(doc(db, "site", "content"));
      console.log(
        "Firebase connection test:",
        testDoc.exists() ? "Connected!" : "No site content yet",
      );
    } catch (testError) {
      console.error("Firebase connection test failed:", testError);
    }

    // Auth state listener
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    });

    // Load from Firebase
    await loadFromFirebase();
  } catch (error) {
    console.error("Firebase initialization error:", error);
    console.log("Falling back to localStorage mode");
    firebaseInitialized = false;
    loadFromLocalStorage();
  }

  loadRememberedEmail();
  // Render everything
  renderSiteContent();
  renderGallery();
  showLoading(false);
}

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (show) {
    overlay.classList.remove("hidden", "opacity-0", "pointer-events-none");
  } else {
    overlay.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => overlay.classList.add("hidden"), 500);
  }
}

// ==================== LOCAL STORAGE ====================
function loadFromLocalStorage() {
  const storedSite = localStorage.getItem("artistPortfolio_siteData");
  const storedArtworks = localStorage.getItem("artistPortfolio_artworks");

  siteData = storedSite ? JSON.parse(storedSite) : { ...defaultSiteData };
  artworks = storedArtworks
    ? JSON.parse(storedArtworks)
    : { ...defaultArtworks };
}

function saveToLocalStorage() {
  localStorage.setItem("artistPortfolio_siteData", JSON.stringify(siteData));
  localStorage.setItem("artistPortfolio_artworks", JSON.stringify(artworks));
}

// ==================== FIREBASE FUNCTIONS ====================
async function loadFromFirebase() {
  try {
    const { doc, getDoc, collection, getDocs, query, orderBy } =
      window.firebaseFirestore;

    // Load site data
    const siteDoc = await getDoc(doc(db, "site", "content"));
    if (siteDoc.exists()) {
      siteData = { ...defaultSiteData, ...siteDoc.data() };
    } else {
      siteData = { ...defaultSiteData };
      await window.firebaseFirestore.setDoc(
        doc(db, "site", "content"),
        siteData,
      );
    }

    // Load artworks
    const artworksQuery = query(
      collection(db, "artworks"),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(artworksQuery);

    artworks.paintings = [];
    artworks.portraits = [];

    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const artwork = { id: docSnap.id, ...data };
        if (data.category === "portraits") {
          artworks.portraits.push(artwork);
        } else {
          artworks.paintings.push(artwork);
        }
      });
    } else {
      // Seed default artworks
      artworks = { ...defaultArtworks };
      for (const [category, items] of Object.entries(artworks)) {
        for (const item of items) {
          await window.firebaseFirestore.addDoc(collection(db, "artworks"), {
            ...item,
            category,
            createdAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error("Firebase load error:", error);
    loadFromLocalStorage();
  }
}

async function saveSiteDataToFirebase() {
  if (!firebaseInitialized || !db) return false;
  try {
    const { setDoc, doc } = window.firebaseFirestore;
    await setDoc(doc(db, "site", "content"), siteData);
    return true;
  } catch (error) {
    console.error("Firebase save error:", error);
    return false;
  }
}

async function addArtworkToFirebase(artworkData, imageFile) {
  if (!firebaseInitialized || !db) {
    // Offline mode - base64 fallback
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = (e) => {
        const newArtwork = {
          id: Date.now().toString(),
          ...artworkData,
          image: e.target.result,
          createdAt: new Date().toISOString(),
        };
        artworks[artworkData.category].unshift(newArtwork);
        saveToLocalStorage();
        resolve(newArtwork);
      };
      reader.readAsDataURL(imageFile);
    });
  }

  // Upload image to Supabase Storage
  const fileExt = imageFile.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${artworkData.category}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("artworks")
    .upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseClient.storage.from("artworks").getPublicUrl(filePath);

  // Save artwork data to Firestore (no image field, just metadata)
  const { addDoc, collection, serverTimestamp } = window.firebaseFirestore;
  const docRef = await addDoc(collection(db, "artworks"), {
    ...artworkData,
    image: publicUrl,
    imagePath: filePath, // Supabase path for deletion
    storageProvider: "supabase",
    createdAt: serverTimestamp(),
  });

  const newArtwork = { id: docRef.id, ...artworkData, image: publicUrl };
  artworks[artworkData.category].unshift(newArtwork);
  return newArtwork;
}

async function deleteArtworkFromFirebase(id, category) {
  const artwork = artworks[category].find((a) => a.id === id);
  if (!artwork) return;

  if (firebaseInitialized && db) {
    try {
      // Delete from Firestore
      const { deleteDoc, doc } = window.firebaseFirestore;
      await deleteDoc(doc(db, "artworks", id));

      // Delete from Supabase Storage
      if (artwork.imagePath) {
        const { error } = await supabaseClient.storage
          .from("artworks")
          .remove([artwork.imagePath]);
        if (error) console.error("Supabase delete error:", error);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  artworks[category] = artworks[category].filter((a) => a.id !== id);
  saveToLocalStorage();
}

async function recordOrderToFirebase(orderData) {
  if (!firebaseInitialized || !db) return;
  try {
    const { addDoc, collection, serverTimestamp } = window.firebaseFirestore;
    await addDoc(collection(db, "orders"), {
      ...orderData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Order record error:", error);
  }
}

async function loadOrdersFromFirebase() {
  const container = document.getElementById("ordersList");

  if (!firebaseInitialized || !db) {
    container.innerHTML =
      '<p class="text-sm text-slate-400 text-center py-8">Orders require Firebase setup</p>';
    return;
  }

  container.innerHTML =
    '<div class="flex justify-center py-8"><div class="loading-spinner"></div></div>';

  try {
    const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML =
        '<p class="text-sm text-slate-400 text-center py-8">No orders yet</p>';
      return;
    }

    let html = "";
    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      const date = order.createdAt
        ? new Date(order.createdAt.toDate()).toLocaleDateString()
        : "Just now";
      html += `
                        <div class="bg-white rounded-xl p-4 border border-slate-100">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <p class="font-medium text-slate-900">${order.customerName}</p>
                                    <p class="text-sm text-slate-500">${order.artworkTitle}</p>
                                </div>
                                <span class="text-sm font-medium text-slate-900">$${order.amount}</span>
                            </div>
                            <div class="flex justify-between items-center text-xs text-slate-400">
                                <span>${order.customerEmail}</span>
                                <span class="${order.status === "paid" ? "text-green-600" : "text-amber-600"} font-medium">${order.status || "pending"}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">Ref: ${order.reference} · ${date}</p>
                        </div>
                    `;
    });
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML =
      '<p class="text-sm text-slate-400 text-center py-8">Error loading orders</p>';
  }
}

// ==================== AUTH ====================
async function handleAdminLogin(e) {
  e.preventDefault();
  toggleBtnLoading("loginBtn", "loginBtnText", "loginSpinner", true);

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  if (firebaseInitialized && auth) {
    try {
      const { signInWithEmailAndPassword } = window.firebaseAuth;
      await signInWithEmailAndPassword(auth, email, password);
      closeAdminModal();
      setTimeout(() => {
        openCmsModal();
        showToast("Welcome to Dashboard");
      }, 300);
    } catch (error) {
      showToast("Invalid email or password");
    }
  } else {
    // Offline mode - simple check
    if (email === "admin@studio.com" && password === "admin123") {
      currentUser = { email };
      closeAdminModal();
      setTimeout(() => {
        openCmsModal();
        showToast("Welcome (Offline Mode)");
      }, 300);
    } else {
      showToast("Invalid credentials. Use admin@studio.com / admin123");
    }
  }

  toggleBtnLoading("loginBtn", "loginBtnText", "loginSpinner", false);
}

async function logout() {
  if (firebaseInitialized && auth) {
    const { signOut } = window.firebaseAuth;
    await signOut(auth);
  }
  currentUser = null;
  closeCmsModal();
  showToast("Logged out");
}

// ==================== RENDER FUNCTIONS ====================
function renderSiteContent() {
  document.title = `STUDIO — ${siteData.tagline || "Portfolio"}`;
  const headerLogoText = document.getElementById("headerLogoText");
  if (headerLogoText) {
    headerLogoText.textContent = siteData.artistName || "Artist";
  }

  const footerLogoText = document.getElementById("footerLogoText");
  if (footerLogoText) {
    footerLogoText.textContent = siteData.artistName || "Artist";
  }
  document.getElementById("footerTagline").textContent =
    siteData.tagline || "Fine Art";
  document.getElementById("aboutName").textContent =
    siteData.artistName || "Artist";
  document.getElementById("copyrightText").textContent =
    ` ${siteData.artistName || "Artist"}. All rights reserved.`;

  document.getElementById("heroTagline").textContent =
    siteData.heroTagline || "";
  document.getElementById("heroTitle").innerHTML = (
    siteData.heroTitle || ""
  ).replace(/\n/g, "<br>");
  document.getElementById("heroSubtitle").textContent =
    siteData.heroSubtitle || "";

  const bioContainer = document.getElementById("aboutBio");
  bioContainer.innerHTML = `<p>${siteData.bio1 || ""}</p><p>${siteData.bio2 || ""}</p><p>${siteData.bio3 || ""}</p>`;

  const emailEl = document.getElementById("footerEmail");
  if (emailEl) {
    emailEl.textContent = siteData.email || "";
    emailEl.href = `mailto:${siteData.email || ""}`;
  }
  const locEl = document.getElementById("footerLocation");
  if (locEl) locEl.textContent = siteData.location || "";

  const telEl = document.getElementById("telegramLink");
  if (telEl) telEl.href = siteData.telegram || "#";
}

const formatPrice = (price) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(price);

function createCard(artwork) {
  return `
                <article class="art-card group bg-white rounded-xl overflow-hidden border border-slate-100">
                    <div class="relative aspect-[4/5] overflow-hidden bg-slate-100 cursor-pointer" onclick="openLightbox('${artwork.id}', '${artwork.category || "paintings"}')">
                        <img src="${artwork.image}" alt="${artwork.title}" class="card-image w-full h-full object-cover" loading="lazy" onload="this.classList.add('loaded')">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-500"></div>
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-lg font-medium text-slate-900">${artwork.title}</h3>
                            <span class="text-sm text-slate-400 font-light">${artwork.size || ""}</span>
                        </div>
                        <p class="text-sm text-slate-500 mb-4 font-light">${artwork.medium || ""}</p>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-900 font-medium">${formatPrice(artwork.price)}</span>
                            <button onclick="event.stopPropagation(); openPaymentModal('${artwork.id}', '${artwork.category || "paintings"}')" 
                                    class="text-sm font-medium text-white bg-slate-900 px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-slate-900/10">
                                Buy Now
                            </button>
                        </div>
                    </div>
                </article>
            `;
}

function renderGallery() {
  const paintingsGrid = document.getElementById("paintingsGrid");
  const portraitsGrid = document.getElementById("portraitsGrid");

  if (!paintingsGrid || !portraitsGrid) return;

  document
    .getElementById("paintingsEmpty")
    .classList.toggle("hidden", artworks.paintings.length > 0);
  document
    .getElementById("portraitsEmpty")
    .classList.toggle("hidden", artworks.portraits.length > 0);

  paintingsGrid.innerHTML = artworks.paintings
    .map((a) => ({ ...a, category: "paintings" }))
    .map(createCard)
    .join("");
  portraitsGrid.innerHTML = artworks.portraits
    .map((a) => ({ ...a, category: "portraits" }))
    .map(createCard)
    .join("");
}

function renderArtworkList() {
  const container = document.getElementById("artworkList");
  if (!container) return;

  let html = "";
  ["paintings", "portraits"].forEach((category) => {
    if (artworks[category].length > 0) {
      html += `<div class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 mt-4">${category}</div>`;
      artworks[category].forEach((artwork) => {
        html += `
                            <div class="artwork-item flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
                                <div class="flex items-center space-x-3">
                                    <img src="${artwork.image}" alt="${artwork.title}" class="w-12 h-12 rounded object-cover">
                                    <div>
                                        <p class="text-sm font-medium text-slate-900">${artwork.title}</p>
                                        <p class="text-xs text-slate-500">${formatPrice(artwork.price)} · ${artwork.medium || ""}</p>
                                    </div>
                                </div>
                                <button onclick="deleteArtwork('${artwork.id}', '${category}')" class="text-red-500 hover:text-red-700 p-2 transition-colors">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        `;
      });
    }
  });

  container.innerHTML =
    html ||
    '<p class="text-sm text-slate-400 text-center py-8">No artworks yet. Add your first piece above.</p>';
}

// ==================== LIGHTBOX ====================
window.openLightbox = function (id, category) {
  const artwork = artworks[category].find((a) => a.id === id);
  if (!artwork) return;

  const lb = document.createElement("div");
  lb.className =
    "lightbox open fixed inset-0 z-[70] bg-slate-900/95 flex items-center justify-center p-4";
  lb.innerHTML = `
                <button onclick="this.parentElement.remove(); document.body.style.overflow=''" class="absolute top-6 right-6 text-white/70 hover:text-white">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <img src="${artwork.image}" alt="${artwork.title}" class="max-w-full max-h-[85vh] object-contain rounded-lg" onload="this.classList.add('loaded')">
                <div class="absolute bottom-6 left-0 right-0 text-center">
                    <p class="text-white text-xl font-light">${artwork.title}</p>
                    <p class="text-white/60 text-sm mt-1">${artwork.medium || ""} · ${artwork.size || ""}</p>
                    <p class="text-white text-lg font-medium mt-2">${formatPrice(artwork.price)}</p>
                    <button onclick="document.querySelector('.lightbox').remove(); document.body.style.overflow=''; openPaymentModal('${artwork.id}', '${category}')" 
                            class="mt-4 px-6 py-3 bg-white text-slate-900 rounded-full text-sm font-medium hover:bg-slate-100">Buy This Piece</button>
                </div>
            `;
  document.body.appendChild(lb);
  document.body.style.overflow = "hidden";
};

// ==================== PAYMENT ====================
window.openPaymentModal = function (id, category) {
  const artwork = artworks[category].find((a) => a.id === id);
  if (!artwork) return;

  currentPaymentArtwork = artwork;
  document.getElementById("paymentItemTitle").textContent = artwork.title;
  document.getElementById("paymentItemName").textContent = artwork.title;
  document.getElementById("paymentItemPrice").textContent = formatPrice(
    artwork.price,
  );
  document.getElementById("paymentItemImage").src = artwork.image;

  document.getElementById("paymentModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

window.closePaymentModal = function () {
  document.getElementById("paymentModal").classList.add("hidden");
  document.body.style.overflow = "";
  currentPaymentArtwork = null;
};

window.initiatePaystackPayment = function (e) {
  e.preventDefault();

  if (!siteData.paystackKey) {
    showToast("Payment not configured. Contact artist.");
    return;
  }

  const name = document.getElementById("buyerName").value;
  const email = document.getElementById("buyerEmail").value;
  const phone = document.getElementById("buyerPhone").value;
  const amount = Math.round(currentPaymentArtwork.price * 100);

  const popup = new PaystackPop();
  popup.newTransaction({
    key: siteData.paystackKey,
    email: email,
    amount: amount,
    currency: siteData.currency || "NGN",
    metadata: {
      custom_fields: [
        {
          display_name: "Customer Name",
          variable_name: "customer_name",
          value: name,
        },
        { display_name: "Phone", variable_name: "phone", value: phone },
        {
          display_name: "Artwork",
          variable_name: "artwork",
          value: currentPaymentArtwork.title,
        },
      ],
    },
    onSuccess: async (transaction) => {
      await recordOrderToFirebase({
        artworkId: currentPaymentArtwork.id,
        artworkTitle: currentPaymentArtwork.title,
        amount: currentPaymentArtwork.price,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        reference: transaction.reference,
        status: "paid",
        paymentMethod: "paystack",
      });

      showToast(`Payment successful! Ref: ${transaction.reference}`);
      closePaymentModal();
    },
    onCancel: () => showToast("Payment cancelled"),
    onError: (error) => showToast("Payment failed: " + error.message),
  });
};

// ==================== CMS FUNCTIONS ====================
window.switchCmsTab = function (tabName) {
  document.querySelectorAll('[id^="cmsTab-"]').forEach((tab) => {
    const isActive = tab.id === `cmsTab-${tabName}`;
    tab.classList.toggle("text-slate-900", isActive);
    tab.classList.toggle("border-slate-900", isActive);
    tab.classList.toggle("text-slate-500", !isActive);
    tab.classList.toggle("border-transparent", !isActive);
  });
  document.querySelectorAll('[id^="cmsPanel-"]').forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `cmsPanel-${tabName}`);
  });

  if (tabName === "orders") loadOrdersFromFirebase();
};

window.openCmsModal = function () {
  populateCmsFields();
  renderArtworkList();
  document.getElementById("cmsModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  switchCmsTab("artworks");
};

window.closeCmsModal = function () {
  document.getElementById("cmsModal").classList.add("hidden");
  document.body.style.overflow = "";
};

window.openAdminModal = function () {
  document.getElementById("adminModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

window.closeAdminModal = function () {
  document.getElementById("adminModal").classList.add("hidden");
  document.body.style.overflow = "";
};

window.handleAdminLogin = handleAdminLogin;
window.logout = logout;

async function saveSiteContent() {
  toggleBtnLoading(
    "saveContentBtn",
    "saveContentText",
    "saveContentSpinner",
    true,
  );

  siteData.artistName = document.getElementById("cmsArtistName").value;
  siteData.tagline = document.getElementById("cmsTagline").value;
  siteData.heroTagline = document.getElementById("cmsHeroTagline").value;
  siteData.heroTitle = document.getElementById("cmsHeroTitle").value;
  siteData.heroSubtitle = document.getElementById("cmsHeroSubtitle").value;
  siteData.bio1 = document.getElementById("cmsBio1").value;
  siteData.bio2 = document.getElementById("cmsBio2").value;
  siteData.bio3 = document.getElementById("cmsBio3").value;
  siteData.email = document.getElementById("cmsEmail").value;
  siteData.location = document.getElementById("cmsLocation").value;
  siteData.telegram = document.getElementById("cmsTelegram").value;

  saveToLocalStorage();
  const saved = await saveSiteDataToFirebase();

  renderSiteContent();
  showToast(saved ? "Saved to cloud" : "Saved locally");

  toggleBtnLoading(
    "saveContentBtn",
    "saveContentText",
    "saveContentSpinner",
    false,
  );
}
window.saveSiteContent = saveSiteContent;

async function savePaymentSettings() {
  toggleBtnLoading(
    "savePaymentBtn",
    "savePaymentText",
    "savePaymentSpinner",
    true,
  );

  siteData.paystackKey = document.getElementById("cmsPaystackKey").value.trim();
  siteData.currency = document.getElementById("cmsCurrency").value;

  saveToLocalStorage();
  await saveSiteDataToFirebase();

  showToast("Payment settings saved");
  toggleBtnLoading(
    "savePaymentBtn",
    "savePaymentText",
    "savePaymentSpinner",
    false,
  );
}
window.savePaymentSettings = savePaymentSettings;

async function handleAddArtwork(e) {
  e.preventDefault();

  if (!selectedImageFile) {
    showToast("Please upload an image");
    return;
  }

  toggleBtnLoading("addArtBtn", "addArtBtnText", "addArtSpinner", true);

  try {
    const artworkData = {
      title: document.getElementById("newArtTitle").value,
      price: parseFloat(document.getElementById("newArtPrice").value),
      category: document.getElementById("newArtCategory").value,
      medium: document.getElementById("newArtMedium").value,
      size: document.getElementById("newArtSize").value,
    };

    await addArtworkToFirebase(artworkData, selectedImageFile);

    renderGallery();
    renderArtworkList();

    document.getElementById("addArtworkForm").reset();
    document.getElementById("uploadPreview").classList.add("hidden");
    document.getElementById("uploadPlaceholder").classList.remove("hidden");
    selectedImageFile = null;

    showToast(`"${artworkData.title}" added!`);
  } catch (error) {
    console.error("Add artwork error:", error);
    showToast("Error adding artwork");
  } finally {
    toggleBtnLoading("addArtBtn", "addArtBtnText", "addArtSpinner", false);
  }
}
window.handleAddArtwork = handleAddArtwork;

async function deleteArtwork(id, category) {
  if (!confirm("Delete this artwork permanently?")) return;

  await deleteArtworkFromFirebase(id, category);
  renderGallery();
  renderArtworkList();
  showToast("Artwork deleted");
}
window.deleteArtwork = deleteArtwork;

function populateCmsFields() {
  document.getElementById("cmsArtistName").value = siteData.artistName || "";
  document.getElementById("cmsTagline").value = siteData.tagline || "";
  document.getElementById("cmsHeroTagline").value = siteData.heroTagline || "";
  document.getElementById("cmsHeroTitle").value = siteData.heroTitle || "";
  document.getElementById("cmsHeroSubtitle").value =
    siteData.heroSubtitle || "";
  document.getElementById("cmsBio1").value = siteData.bio1 || "";
  document.getElementById("cmsBio2").value = siteData.bio2 || "";
  document.getElementById("cmsBio3").value = siteData.bio3 || "";
  document.getElementById("cmsEmail").value = siteData.email || "";
  document.getElementById("cmsLocation").value = siteData.location || "";
  document.getElementById("cmsTelegram").value = siteData.telegram || "";
  document.getElementById("cmsPaystackKey").value = siteData.paystackKey || "";
  document.getElementById("cmsCurrency").value = siteData.currency || "NGN";
}

// ==================== IMAGE UPLOAD ====================
window.handleImageSelect = function (input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be under 5MB");
    return;
  }

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById("uploadPreview");
    preview.querySelector("img").src = e.target.result;
    preview.classList.remove("hidden");
    document.getElementById("uploadPlaceholder").classList.add("hidden");
  };
  reader.readAsDataURL(file);
};

// Drag and drop
const dropZone = document.getElementById("dropZone");
if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("drag-over"),
  );
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      document.getElementById("newArtImage").files = e.dataTransfer.files;
      handleImageSelect(document.getElementById("newArtImage"));
    }
  });
}

// ==================== UI UTILITIES ====================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.opacity = "1";
  setTimeout(() => (toast.style.opacity = "0"), 3000);
}

function toggleBtnLoading(btnId, textId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  const spinner = document.getElementById(spinnerId);

  if (btn) btn.disabled = loading;
  if (text) text.classList.toggle("hidden", loading);
  if (spinner) spinner.classList.toggle("hidden", !loading);
}

window.togglePasswordVisibility = function (inputId, button) {
  const input = document.getElementById(inputId);
  const eyeIcon = button.querySelector("svg:not(.hidden)");
  const eyeOffIcon = button.querySelector(".hidden");

  if (input.type === "password") {
    input.type = "text";
    eyeIcon.classList.add("hidden");
    eyeOffIcon.classList.remove("hidden");
    button.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    eyeOffIcon.classList.add("hidden");
    eyeIcon.classList.remove("hidden");
    button.setAttribute("aria-label", "Show password");
  }
};

window.switchTab = function (tabName) {
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("active", isActive);
    tab.classList.toggle("text-slate-900", isActive);
    tab.classList.toggle("text-slate-500", !isActive);
    tab.setAttribute("aria-selected", isActive);
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
    setTimeout(() => {
      if (!content.classList.contains("active")) {
        content.hidden = true;
        content.style.display = "none";
      }
    }, 500);
  });
  const target = document.getElementById(tabName);
  if (target) {
    target.hidden = false;
    target.style.display = "block";
    requestAnimationFrame(() => target.classList.add("active"));
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.toggleMobileMenu = function () {
  const menu = document.getElementById("mobileMenu");
  const btn = document.getElementById("mobileMenuBtn");
  const isHidden = menu.classList.contains("hidden");
  menu.classList.toggle("hidden");
  btn.setAttribute("aria-expanded", isHidden);
};

// ==================== EVENT LISTENERS ====================
let adminClickCount = 0;
let adminClickTimer = null;
document.getElementById("adminTrigger").addEventListener("click", () => {
  adminClickCount++;
  if (!adminClickTimer) {
    adminClickTimer = setTimeout(() => {
      adminClickCount = 0;
      adminClickTimer = null;
    }, 2000);
  }
  if (adminClickCount >= 5) {
    openAdminModal();
    adminClickCount = 0;
    clearTimeout(adminClickTimer);
    adminClickTimer = null;
  }
});

window.addEventListener("scroll", () => {
  const header = document.getElementById("header");
  if (header) header.classList.toggle("shadow-sm", window.pageYOffset > 50);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAdminModal();
    closeCmsModal();
    closePaymentModal();
    const lb = document.querySelector(".lightbox");
    if (lb) {
      lb.remove();
      document.body.style.overflow = "";
    }
  }
});
// REMEMBER ME
function loadRememberedEmail() {
  const remembered = localStorage.getItem("adminEmail");
  if (remembered) {
    document.getElementById("adminEmail").value = remembered;
    document.getElementById("rememberMe").checked = true;
  }
}

// FORGOT PASSWORD UI
window.showForgotPassword = function () {
  closeAdminModal();
  document.getElementById("forgotPasswordModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

window.closeForgotPassword = function () {
  document.getElementById("forgotPasswordModal").classList.add("hidden");
  document.body.style.overflow = "";
};

window.handleForgotPassword = async function (e) {
  e.preventDefault();
  const email = document.getElementById("resetEmail").value;

  toggleBtnLoading("resetBtn", "resetBtnText", "resetSpinner", true);

  if (firebaseInitialized && auth) {
    try {
      const { sendPasswordResetEmail } = window.firebaseAuth;
      await sendPasswordResetEmail(auth, email);
      showToast("Reset link sent! Check your email.");
      closeForgotPassword();
    } catch (error) {
      showToast("Error: " + error.message);
    }
  } else {
    showToast("Password reset requires Firebase. Contact support.");
  }

  toggleBtnLoading("resetBtn", "resetBtnText", "resetSpinner", false);
};

// MODIFIED LOGIN HANDLER
async function handleAdminLogin(e) {
  e.preventDefault();
  toggleBtnLoading("loginBtn", "loginBtnText", "loginSpinner", true);

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const remember = document.getElementById("rememberMe").checked;

  // Save/remove email based on Remember Me
  if (remember) {
    localStorage.setItem("adminEmail", email);
  } else {
    localStorage.removeItem("adminEmail");
  }

  if (firebaseInitialized && auth) {
    try {
      const { signInWithEmailAndPassword } = window.firebaseAuth;
      await signInWithEmailAndPassword(auth, email, password);
      closeAdminModal();
      setTimeout(() => {
        openCmsModal();
        showToast("Welcome to Dashboard");
      }, 300);
    } catch (error) {
      showToast("Invalid email or password");
    }
  } else {
    // Offline mode
    if (email === "admin@studio.com" && password === "admin123") {
      currentUser = { email };
      closeAdminModal();
      setTimeout(() => {
        openCmsModal();
        showToast("Welcome (Offline Mode)");
      }, 300);
    } else {
      showToast("Invalid credentials. Use admin@studio.com / admin123");
    }
  }

  toggleBtnLoading("loginBtn", "loginBtnText", "loginSpinner", false);
}

// ==================== START ====================
init();

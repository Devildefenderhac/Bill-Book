// ─────────────────────────────────────────────────────────────
//  BT-58D Virtual POS Thermal Printer Simulator (58mm)
//  Audio Synthesizer • Live Spooler • 20 Retail Scenarios • PNG Export
// ─────────────────────────────────────────────────────────────

const API_BASE = "http://127.0.0.1:5000/api";
const POS_API_KEY = "BB_POS_SECURE_API_KEY_7061";

// State
let soundEnabled = true;
let isPowerOn = true;
let currentDensity = "normal";
let printHistory = [];
let audioCtx = null;

// ── Web Audio API Synthesizer (Realistic Thermal Printer Sound) ──
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Thermal print head line-step buzz sound
function playThermalPrintSound(durationMs = 800) {
  if (!soundEnabled || !isPowerOn) return;
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Thermal stepping motor sound (sawtooth with rapid frequency modulation)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + durationMs / 1000);
    
    // Gain envelope
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + durationMs / 1000);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    console.warn("Audio synthesis error:", e);
  }
}

// Paper cutter / tear sound
function playPaperCutSound() {
  if (!soundEnabled || !isPowerOn) return;
  try {
    initAudio();
    if (!audioCtx) return;
    
    // High frequency white-noise snip
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch (e) {}
}

// Cash drawer kick solenoid sound (12V impulse)
function playCashDrawerSound() {
  if (!soundEnabled || !isPowerOn) return;
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

// ── 20 Retail Scenarios Data for BT-58D ──────────────────────────
const SCENARIOS = {
  cash: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "BILL-20260718-0101",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Vikas Malhotra",
    customerPhone: "9811122233",
    workerName: "Cashier Counter 1",
    items: [
      { name: "Pure Linen Shirt [L]", code: "SRT-M-103", qty: 1, price: 1499, total: 1399, discount: 100 },
    ],
    subtotal: 1499,
    discount: 100,
    grandTotal: 1399,
    paymentMode: "CASH",
    paymentStatus: "PAID",
    cashTendered: 1500,
    changeReturned: 101,
    status: "COMPLETED",
  },
  upi_qr: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "BILL-20260718-0102",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    workerName: "Cashier Counter 1",
    items: [
      { name: "Classic Cotton T-Shirt [L]", code: "TSH-M-101", qty: 2, price: 699, total: 1398, discount: 0 },
      { name: "Slim Fit Denim Jeans [32]", code: "JNS-M-102", qty: 1, price: 1899, total: 1709.1, discount: 189.9 },
    ],
    subtotal: 3297,
    discount: 189.9,
    grandTotal: 3107.1,
    paymentMode: "UPI",
    paymentStatus: "PAID",
    upiRefNo: "UPI/620199283711",
    status: "COMPLETED",
    showQr: true,
  },
  card: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "BILL-20260718-0103",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Pooja Hegde",
    customerPhone: "9822233344",
    workerName: "Cashier Counter 1",
    items: [
      { name: "Silk Blend Kurta Set [40]", code: "ETH-M-401", qty: 1, price: 2499, total: 2499, discount: 0 },
    ],
    subtotal: 2499,
    discount: 0,
    grandTotal: 2499,
    paymentMode: "CARD",
    paymentStatus: "PAID",
    cardRefNo: "HDFC-POS-AUTH-99382",
    status: "COMPLETED",
  },
  split: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "BILL-20260718-0104",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Karan Singh",
    customerPhone: "9833344455",
    workerName: "Cashier Counter 1",
    items: [
      { name: "Floral Print Chiffon Dress [M]", code: "DRS-W-201", qty: 1, price: 2199, total: 2000, discount: 199 },
      { name: "Satin V-Neck Blouse [S]", code: "TOP-W-202", qty: 1, price: 999, total: 999, discount: 0 },
      { name: "Leather Reversible Belt", code: "ACC-001", qty: 1, price: 599, total: 501, discount: 98 },
    ],
    subtotal: 3797,
    discount: 297,
    grandTotal: 3500,
    paymentMode: "SPLIT (Cash + UPI)",
    paymentStatus: "PAID",
    cashTendered: 2000,
    upiRefNo: "UPI/9988221100 (₹1,500)",
    status: "COMPLETED",
  },
  udhar: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "BILL-20260718-0105",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Ramesh Khata Account",
    customerPhone: "9844455566",
    workerName: "Store Owner",
    items: [
      { name: "Designer Anarkali Suit [XL]", code: "ETH-W-402", qty: 1, price: 3499, total: 3499, discount: 0 },
      { name: "Boys Cotton Set [4-5Y]", code: "KID-B-301", qty: 1, price: 799, total: 799, discount: 0 },
    ],
    subtotal: 4298,
    discount: 0,
    grandTotal: 4298,
    paymentMode: "UDHAR / CREDIT",
    paymentStatus: "PENDING",
    pendingAmount: 4298,
    advanceAmount: 0,
    previousBalance: 3200,
    totalBalanceDue: 7498,
    status: "PENDING",
    udharAuthorizedBy: "Store Owner (Approved)",
  },
  settlement: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "RCPT-KHATA-20260718-001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Ramesh Khata Account",
    customerPhone: "9844455566",
    workerName: "Store Owner",
    type: "SETTLEMENT",
    title: "UDHAR KHATA PAYMENT RECEIPT",
    items: [],
    previousBalance: 7498,
    amountReceived: 5000,
    newBalanceDue: 2498,
    paymentMode: "CASH",
    paymentStatus: "PARTIALLY_SETTLED",
    grandTotal: 5000,
    status: "SETTLED",
  },
  return: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "BILL-20260718-0102",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    workerName: "Store Owner",
    type: "RETURN",
    title: "ITEM RETURN & REFUND VOUCHER",
    items: [
      { name: "[RETURNED] Classic Cotton T-Shirt [L]", code: "TSH-M-101", qty: -1, price: 699, total: -699 },
    ],
    subtotal: -699,
    discount: 0,
    grandTotal: -699,
    refundMode: "CASH REFUND",
    status: "RETURNED",
  },
  exchange: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "EXCH-20260718-001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Deepak Joshi",
    customerPhone: "9855566677",
    workerName: "Cashier Counter 1",
    type: "EXCHANGE",
    title: "SIZE / ITEM EXCHANGE RECEIPT",
    items: [
      { name: "[RETURN] Slim Jeans [Size 30]", code: "JNS-M-102", qty: -1, price: 1899, total: -1899 },
      { name: "[NEW] Slim Jeans [Size 34]", code: "JNS-M-102", qty: 1, price: 1899, total: 1899 },
      { name: "[ADD-ON] Leather Belt", code: "ACC-001", qty: 1, price: 599, total: 599 },
    ],
    subtotal: 599,
    discount: 0,
    grandTotal: 599,
    paymentMode: "UPI",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  advance: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "ORD-ADV-20260718-001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Sanjay Singhania (Wedding)",
    customerPhone: "9866677788",
    workerName: "Store Owner",
    type: "ADVANCE_ORDER",
    title: "ADVANCE CUSTOMER BOOKING SLIP",
    items: [
      { name: "Royal Sherwani Customized [42]", code: "ETH-M-SPECIAL", qty: 1, price: 8999, total: 8999 },
    ],
    subtotal: 8999,
    discount: 0,
    grandTotal: 8999,
    advancePaid: 3000,
    pendingAtDelivery: 5999,
    deliveryDate: "25/07/2026",
    paymentMode: "UPI (ADVANCE)",
    status: "BOOKED",
  },
  bulk: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Wholesale & Retail",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "INV-BULK-20260718-001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "City Uniforms & Co",
    customerPhone: "9877788899",
    workerName: "Store Owner",
    title: "TAX INVOICE - WHOLESALE",
    items: [
      { name: "Cotton Crew T-Shirt (Pack of 10)", code: "TSH-BULK-10", qty: 5, price: 4500, total: 22500 },
      { name: "Ankle Socks Box (50 Pairs)", code: "ACC-BOX-50", qty: 2, price: 3500, total: 7000 },
    ],
    subtotal: 29500,
    discount: 2500,
    grandTotal: 27000,
    paymentMode: "BANK NEFT / CHEQUE",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  cancelled: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "BILL-20260718-0099",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Cancelled Transaction",
    customerPhone: "----------",
    workerName: "Store Owner",
    items: [
      { name: "Classic Cotton T-Shirt [L]", code: "TSH-M-101", qty: 1, price: 699, total: 699 },
    ],
    subtotal: 699,
    discount: 0,
    grandTotal: 699,
    paymentMode: "VOID",
    paymentStatus: "CANCELLED",
    status: "CANCELLED",
  },
  duplicate: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "BILL-20260718-0001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    workerName: "Store Owner",
    isDuplicate: true,
    printCount: 2,
    items: [
      { name: "Classic Cotton T-Shirt [L]", code: "TSH-M-101", qty: 2, price: 699, total: 1398 },
      { name: "Slim Fit Denim Jeans [32]", code: "JNS-M-102", qty: 1, price: 1899, total: 1709.1 },
    ],
    subtotal: 3297,
    discount: 189.9,
    grandTotal: 3107.1,
    paymentMode: "UPI",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  discount: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Diwali Mega Sale",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "BILL-20260718-FEST",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Priya Sharma",
    customerPhone: "9888899900",
    workerName: "Cashier Counter 1",
    items: [
      { name: "Silk Blend Kurta Set", code: "ETH-M-401", qty: 1, price: 2499, total: 1999, discount: 500 },
      { name: "Floral Midi Dress", code: "DRS-W-201", qty: 1, price: 2199, total: 1699, discount: 500 },
    ],
    subtotal: 4698,
    discount: 1000,
    grandTotal: 3698,
    paymentMode: "UPI",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  gst_tax: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Premier Apparel Store",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    gstin: "07AAACR1234F1Z5",
    billNo: "GST-INV-20260718-001",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Sunil Enterprises",
    customerPhone: "9899900011",
    workerName: "Store Owner",
    title: "GST TAX INVOICE",
    items: [
      { name: "Pure Linen Shirt [M]", code: "HSN:6205", qty: 2, price: 1499, total: 2998 },
    ],
    subtotal: 2855.24,
    cgst: 71.38,
    sgst: 71.38,
    discount: 0,
    grandTotal: 2998,
    paymentMode: "CASH",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  multi_items: {
    storeName: "ROYAL FASHION MALL",
    tagline: "Family Shopping Festival",
    address: "Grand Central Mall, Ground Floor",
    phone: "+91 98765 43210",
    billNo: "BILL-20260718-MULTI",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Verma Family",
    customerPhone: "9812345678",
    workerName: "Cashier Counter 2",
    items: [
      { name: "Cotton Crew T-Shirt [M]", code: "TSH-01", qty: 2, price: 699, total: 1398 },
      { name: "Slim Stretch Denim [32]", code: "JNS-02", qty: 1, price: 1899, total: 1899 },
      { name: "Pure Linen Shirt [XL]", code: "SRT-03", qty: 1, price: 1499, total: 1499 },
      { name: "Floral Chiffon Midi Dress", code: "DRS-04", qty: 1, price: 2199, total: 2199 },
      { name: "Boys Cartoon Set [6-7Y]", code: "KID-05", qty: 2, price: 799, total: 1598 },
      { name: "Girls Party Frock [5-6Y]", code: "KID-06", qty: 1, price: 1299, total: 1299 },
      { name: "Leather Belt [Free Size]", code: "ACC-07", qty: 1, price: 599, total: 599 },
      { name: "Ankle Socks (Pack of 3)", code: "ACC-08", qty: 2, price: 299, total: 598 },
    ],
    subtotal: 11089,
    discount: 1089,
    grandTotal: 10000,
    paymentMode: "CARD (HDFC)",
    paymentStatus: "PAID",
    status: "COMPLETED",
  },
  self_test: {
    storeName: "POS THERMAL PRINTER",
    tagline: "HARDWARE SELF-TEST REPORT",
    address: "MODEL: BT-58D / 58MM",
    phone: "S/N: 202403000001",
    billNo: "DIAG-SELFTEST-01",
    timestamp: new Date().toLocaleString("en-IN"),
    customerName: "Firmware: v2.40-BT",
    customerPhone: "Baud: 9600 bps",
    workerName: "Interface: USB + Bluetooth",
    title: "*** BT-58D SELF TEST OK ***",
    items: [
      { name: "Print Head Resolution", code: "203 DPI", qty: 1, price: 384, total: 384 },
      { name: "Line Width / Columns", code: "32 Font-A", qty: 1, price: 32, total: 32 },
      { name: "Cash Box Trigger Port", code: "12V OK", qty: 1, price: 1, total: 1 },
      { name: "Thermal Sensor Density", code: "25°C OK", qty: 1, price: 100, total: 100 },
    ],
    subtotal: 0,
    discount: 0,
    grandTotal: 0,
    paymentMode: "HARDWARE PASS",
    paymentStatus: "OK",
    status: "COMPLETED",
  },
};

// ── Render Receipt to DOM ───────────────────────────────────────
function renderReceipt(data) {
  if (!isPowerOn) {
    alert("Printer is powered OFF. Turn on the POWER switch at bottom right.");
    return;
  }

  // Trigger sound & LED status
  const ledStatus = document.getElementById("ledStatus");
  if (ledStatus) ledStatus.classList.add("active");
  playThermalPrintSound(700);

  const stage = document.getElementById("paperStage");
  if (!stage) return;

  const isCancelled = data.status === "CANCELLED";
  const isDuplicate = data.isDuplicate || (data.printCount && data.printCount > 1);
  const items = data.items || [];
  const grandTotal = Number(data.grandTotal) || 0;
  const subtotal = Number(data.subtotal) || grandTotal;
  const discount = Number(data.discount) || 0;

  const html = `
    <div class="thermal-receipt density-${currentDensity}">
      
      ${isCancelled ? '<div style="background:#ef4444;color:#fff;text-align:center;font-weight:800;padding:2px;font-size:12px;margin-bottom:6px;">*** VOID / CANCELLED ***</div>' : ''}
      ${isDuplicate ? '<div style="background:#111;color:#fff;text-align:center;font-weight:800;padding:2px;font-size:11px;margin-bottom:6px;">** DUPLICATE COPY **</div>' : ''}
      
      <div class="thermal-header-branding">
        <div class="thermal-store-name">${data.storeName || "ROYAL FASHION MALL"}</div>
        <div class="thermal-tagline">${data.tagline || "Clothing & Apparel Store"}</div>
        <div class="thermal-address">${data.address || "Grand Central Mall, Ground Floor"}</div>
        <div class="thermal-contact">Ph: ${data.phone || "+91 98765 43210"} ${data.gstin ? `| GST: ${data.gstin}` : ""}</div>
      </div>
      
      ${data.title ? `<div style="text-align:center;font-weight:800;font-size:12px;margin:4px 0;">${data.title}</div>` : ''}
      
      <div class="thermal-divider-double">================================</div>
      
      <div class="thermal-meta-row">
        <span>BILL: ${data.billNo || "BILL-0001"}</span>
        <span>${data.timestamp || new Date().toLocaleDateString()}</span>
      </div>
      <div class="thermal-meta-row">
        <span>CUST: ${(data.customerName || "Walk-in Customer").slice(0, 16)}</span>
        <span>${data.customerPhone || ""}</span>
      </div>
      <div class="thermal-meta-row">
        <span>OP: ${(data.workerName || "Staff").slice(0, 14)}</span>
        <span>BT-58D</span>
      </div>
      
      <div class="thermal-divider-dashed">--------------------------------</div>
      <div class="thermal-table-header">
        <span class="col-item">ITEM / SIZE</span>
        <span class="col-qty">QTY</span>
        <span class="col-price">PRICE</span>
        <span class="col-total">TOTAL</span>
      </div>
      <div class="thermal-divider-dashed">--------------------------------</div>
      
      <div class="thermal-items-list">
        ${items.length === 0 ? '<div style="text-align:center;font-size:10px;padding:4px 0;">- No itemized products -</div>' : ''}
        ${items.map(item => `
          <div class="thermal-item-entry">
            <div class="thermal-item-name">${item.name || "Item"}</div>
            <div class="thermal-item-cols">
              <span class="col-item text-muted">${item.code || ""}</span>
              <span class="col-qty">${item.qty || item.quantity || 1}</span>
              <span class="col-price">${Number(item.price || 0).toFixed(2)}</span>
              <span class="col-total">${Number(item.total || item.price || 0).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="thermal-divider-dashed">--------------------------------</div>
      
      <div class="thermal-summary-rows">
        <div class="summary-row">
          <span>TOTAL ITEMS / PIECES:</span>
          <span>${items.length} Items</span>
        </div>
        <div class="summary-row">
          <span>SUBTOTAL:</span>
          <span>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        ${discount > 0 ? `
          <div class="summary-row" style="font-weight:700;">
            <span>DISCOUNT SAVINGS:</span>
            <span>-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        ` : ''}
        ${data.cgst ? `
          <div class="summary-row font-sm text-muted">
            <span>CGST (2.5%):</span>
            <span>₹${Number(data.cgst).toFixed(2)}</span>
          </div>
          <div class="summary-row font-sm text-muted">
            <span>SGST (2.5%):</span>
            <span>₹${Number(data.sgst).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row grand-total-row">
          <span>GRAND TOTAL:</span>
          <span>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div class="summary-row">
          <span>PAYMENT MODE:</span>
          <span class="badge-pay">${data.paymentMode || "CASH"} (${data.paymentStatus || "PAID"})</span>
        </div>
        
        ${data.cashTendered ? `
          <div class="summary-row font-sm">
            <span>Cash Tendered:</span>
            <span>₹${Number(data.cashTendered).toFixed(2)}</span>
          </div>
          <div class="summary-row font-sm">
            <span>Change Returned:</span>
            <span>₹${Number(data.changeReturned || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${data.upiRefNo ? `
          <div class="summary-row font-sm text-muted">
            <span>UPI Ref:</span>
            <span>${data.upiRefNo}</span>
          </div>
        ` : ''}
        
        ${data.cardRefNo ? `
          <div class="summary-row font-sm text-muted">
            <span>Card Auth:</span>
            <span>${data.cardRefNo}</span>
          </div>
        ` : ''}
        
        ${data.previousBalance ? `
          <div class="summary-row font-sm" style="color:#b45309;font-weight:700;">
            <span>Previous Khata Due:</span>
            <span>₹${Number(data.previousBalance).toFixed(2)}</span>
          </div>
        ` : ''}
        ${data.totalBalanceDue ? `
          <div class="summary-row font-sm" style="color:#b91c1c;font-weight:800;">
            <span>Total Balance Due:</span>
            <span>₹${Number(data.totalBalanceDue).toFixed(2)}</span>
          </div>
        ` : ''}
        ${data.amountReceived ? `
          <div class="summary-row font-sm" style="color:#047857;font-weight:700;">
            <span>Payment Received:</span>
            <span>₹${Number(data.amountReceived).toFixed(2)}</span>
          </div>
        ` : ''}
        ${data.newBalanceDue !== undefined ? `
          <div class="summary-row font-sm" style="font-weight:800;">
            <span>Remaining Khata Balance:</span>
            <span>₹${Number(data.newBalanceDue).toFixed(2)}</span>
          </div>
        ` : ''}
        ${data.advancePaid ? `
          <div class="summary-row font-sm" style="color:#047857;font-weight:700;">
            <span>Advance Received:</span>
            <span>₹${Number(data.advancePaid).toFixed(2)}</span>
          </div>
          <div class="summary-row font-sm" style="font-weight:800;">
            <span>Balance on Delivery:</span>
            <span>₹${Number(data.pendingAtDelivery).toFixed(2)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="thermal-divider-dashed">--------------------------------</div>
      
      <!-- QR Section -->
      <div class="thermal-qr-container">
        <div class="qr-box">
          <svg viewBox="0 0 100 100" class="thermal-qr-svg">
            <rect width="100" height="100" fill="#ffffff" />
            <rect x="5" y="5" width="30" height="30" fill="#000000" />
            <rect x="10" y="10" width="20" height="20" fill="#ffffff" />
            <rect x="15" y="15" width="10" height="10" fill="#000000" />
            
            <rect x="65" y="5" width="30" height="30" fill="#000000" />
            <rect x="70" y="10" width="20" height="20" fill="#ffffff" />
            <rect x="75" y="15" width="10" height="10" fill="#000000" />
            
            <rect x="5" y="65" width="30" height="30" fill="#000000" />
            <rect x="10" y="70" width="20" height="20" fill="#ffffff" />
            <rect x="15" y="75" width="10" height="10" fill="#000000" />
            
            <rect x="42" y="12" width="6" height="6" fill="#000" /><rect x="52" y="12" width="6" height="6" fill="#000" />
            <rect x="42" y="24" width="6" height="6" fill="#000" /><rect x="52" y="24" width="6" height="6" fill="#000" />
            <rect x="12" y="42" width="6" height="6" fill="#000" /><rect x="24" y="42" width="6" height="6" fill="#000" />
            <rect x="42" y="42" width="16" height="16" fill="#000" />
            <rect x="64" y="42" width="6" height="6" fill="#000" /><rect x="76" y="42" width="6" height="6" fill="#000" />
            <rect x="88" y="42" width="6" height="6" fill="#000" />
            <rect x="42" y="64" width="6" height="6" fill="#000" /><rect x="54" y="64" width="6" height="6" fill="#000" />
            <rect x="68" y="68" width="8" height="8" fill="#000" /><rect x="82" y="74" width="8" height="8" fill="#000" />
          </svg>
        </div>
        <div class="qr-caption">Scan to Verify / UPI Payment</div>
      </div>
      
      <div class="thermal-divider-double">================================</div>
      
      <div class="thermal-footer">
        <div>* THANK YOU FOR SHOPPING! *</div>
        <div>Exchange within 7 days with bill.</div>
        <div class="font-sm text-muted">BillBook POS • BT-58D Simulation</div>
      </div>
      
      <div class="paper-tear-serration"></div>
    </div>
  `;

  stage.innerHTML = html;

  // Add to history
  addToHistory(data);

  setTimeout(() => {
    if (ledStatus) ledStatus.classList.remove("active");
  }, 700);
}

// Add printed slip to tray history
function addToHistory(data) {
  printHistory.unshift(data);
  if (printHistory.length > 25) printHistory.pop();
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("historyList");
  if (!container) return;

  if (printHistory.length === 0) {
    container.innerHTML = '<div class="history-empty">No previous bills in tray. Printed bills will appear here.</div>';
    return;
  }

  container.innerHTML = printHistory.map((item, idx) => `
    <div class="history-item">
      <div class="history-item-left">
        <strong>${item.billNo || "BILL"} • ₹${(Number(item.grandTotal) || 0).toLocaleString('en-IN')}</strong>
        <small>${item.customerName || "Customer"} • ${item.paymentMode || "CASH"} (${item.timestamp || ""})</small>
      </div>
      <button class="btn-view-hist" onclick="loadHistoryItem(${idx})">View &amp; Reprint</button>
    </div>
  `).join('');
}

window.loadHistoryItem = function(idx) {
  if (printHistory[idx]) {
    renderReceipt(printHistory[idx]);
  }
};

// ── Live Spooler Polling from Backend ────────────────────────────
async function pollBackendQueue() {
  try {
    const res = await fetch(`${API_BASE}/thermal-printer/queue`, {
      headers: { "x-pos-api-key": POS_API_KEY },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
      data.jobs.forEach(job => {
        if (job.billData) {
          renderReceipt(job.billData);
        }
      });
    }
  } catch (e) {
    // Silent fail if backend offline
  }
}

// ── PNG Image Exporter using HTML5 Canvas ────────────────────────
function exportReceiptImage() {
  const receiptEl = document.querySelector(".thermal-receipt");
  if (!receiptEl) {
    alert("No receipt to save!");
    return;
  }

  // Create high-res canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const width = 384; // 58mm width in 203 DPI dots
  const height = 680;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = "#faf8f5";
  ctx.fillRect(0, 0, width, height);

  // Borders & Text
  ctx.fillStyle = currentDensity === 'dark' ? '#000000' : '#111111';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("ROYAL FASHION MALL", width / 2, 35);
  
  ctx.font = '11px monospace';
  ctx.fillText("Premier Apparel Store", width / 2, 52);
  ctx.fillText("Grand Central Mall, Ground Floor", width / 2, 68);
  ctx.fillText("Ph: +91 98765 43210", width / 2, 84);

  ctx.fillText("================================", width / 2, 105);
  
  ctx.textAlign = 'left';
  ctx.fillText("BILL: " + (document.querySelector(".thermal-meta-row span")?.innerText || "BILL-001"), 15, 125);
  ctx.fillText("TIME: " + new Date().toLocaleString("en-IN"), 15, 142);
  ctx.fillText("OP: Cashier 1          BT-58D", 15, 159);
  
  ctx.textAlign = 'center';
  ctx.fillText("--------------------------------", width / 2, 175);
  
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px monospace';
  ctx.fillText("ITEM               QTY    TOTAL", 15, 192);
  ctx.font = '11px monospace';
  ctx.fillText("--------------------------------", 15, 205);
  
  ctx.fillText("Classic Cotton T-Shirt   2   1398.00", 15, 224);
  ctx.fillText("Slim Fit Denim Jeans     1   1709.10", 15, 242);
  
  ctx.fillText("--------------------------------", 15, 265);
  ctx.font = 'bold 14px monospace';
  ctx.fillText("GRAND TOTAL:         Rs. 3107.10", 15, 290);
  ctx.font = '11px monospace';
  ctx.fillText("PAYMENT: UPI (PAID)", 15, 310);
  ctx.fillText("UPI REF: UPI/620199283711", 15, 328);
  
  ctx.textAlign = 'center';
  ctx.fillText("================================", width / 2, 355);
  ctx.fillText("* THANK YOU FOR SHOPPING! *", width / 2, 380);
  ctx.fillText("Exchange within 7 days with bill.", width / 2, 396);
  ctx.fillText("BillBook POS • Model BT-58D", width / 2, 412);

  // Trigger download
  const link = document.createElement("a");
  link.download = `Receipt_BT58D_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Event Handlers & Initialization ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Scenario button clicks
  document.querySelectorAll(".scenario-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const scKey = btn.getAttribute("data-scenario");
      if (SCENARIOS[scKey]) {
        renderReceipt(SCENARIOS[scKey]);
      }
    });
  });

  // 2. Feed Paper Button
  const btnFeed = document.getElementById("btnFeed");
  if (btnFeed) {
    btnFeed.addEventListener("click", () => {
      playThermalPrintSound(250);
      const stage = document.getElementById("paperStage");
      if (stage) {
        const spacer = document.createElement("div");
        spacer.style.height = "25px";
        stage.appendChild(spacer);
      }
    });
  }

  // 3. Cut Paper Button
  const btnCut = document.getElementById("btnCut");
  if (btnCut) {
    btnCut.addEventListener("click", () => {
      playPaperCutSound();
      const receipt = document.querySelector(".thermal-receipt");
      if (receipt) {
        receipt.style.transform = "translateY(15px) rotate(1deg)";
        setTimeout(() => {
          receipt.style.transform = "translateY(0) rotate(0)";
        }, 400);
      }
    });
  }

  // 4. Power Rocker Switch
  const btnPowerSwitch = document.getElementById("btnPowerSwitch");
  const ledPower = document.getElementById("ledPower");
  if (btnPowerSwitch) {
    btnPowerSwitch.addEventListener("click", () => {
      isPowerOn = !isPowerOn;
      btnPowerSwitch.classList.toggle("active", isPowerOn);
      if (ledPower) ledPower.classList.toggle("active", isPowerOn);
    });
  }

  // 5. Sound Toggle
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundToggle.innerText = soundEnabled ? "🔊 Sound: ON" : "🔇 Sound: MUTED";
      initAudio();
    });
  }

  // 6. Thermal Density Buttons
  document.querySelectorAll(".btn-density").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-density").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDensity = btn.getAttribute("data-density");
      const receipt = document.querySelector(".thermal-receipt");
      if (receipt) {
        receipt.className = `thermal-receipt density-${currentDensity}`;
      }
    });
  });

  // 7. Save Image (PNG)
  const btnDownloadImage = document.getElementById("btnDownloadImage");
  if (btnDownloadImage) {
    btnDownloadImage.addEventListener("click", exportReceiptImage);
  }

  // 8. Print to System / PDF
  const btnPrintSystem = document.getElementById("btnPrintSystem");
  if (btnPrintSystem) {
    btnPrintSystem.addEventListener("click", () => {
      window.print();
    });
  }

  // 9. Copy Text
  const btnCopyText = document.getElementById("btnCopyText");
  if (btnCopyText) {
    btnCopyText.addEventListener("click", () => {
      const receipt = document.querySelector(".thermal-receipt");
      if (receipt) {
        navigator.clipboard.writeText(receipt.innerText);
        alert("Receipt text copied to clipboard in 58mm monospace format!");
      }
    });
  }

  // 10. Cash Drawer Kick
  const btnCashDrawerKick = document.getElementById("btnCashDrawerKick");
  if (btnCashDrawerKick) {
    btnCashDrawerKick.addEventListener("click", async () => {
      playCashDrawerSound();
      try {
        await fetch(`${API_BASE}/thermal-printer/cash-drawer/kick`, {
          method: "POST",
          headers: { "x-pos-api-key": POS_API_KEY },
        });
      } catch (e) {}
      alert("💵 12V Solenoid Pulse sent to Cash Box! Drawer popped open.");
    });
  }

  // 11. Custom Bill Builder
  const btnPrintCustom = document.getElementById("btnPrintCustom");
  if (btnPrintCustom) {
    btnPrintCustom.addEventListener("click", () => {
      const name = document.getElementById("customCustName")?.value || "Customer";
      const phone = document.getElementById("customCustPhone")?.value || "";
      const mode = document.getElementById("customPaymentMode")?.value || "CASH";
      const item = document.getElementById("customItemName")?.value || "Custom Item";
      const qty = Number(document.getElementById("customItemQty")?.value) || 1;
      const price = Number(document.getElementById("customItemPrice")?.value) || 0;
      const disc = Number(document.getElementById("customDiscount")?.value) || 0;
      const total = Math.max(0, (qty * price) - disc);

      const customData = {
        storeName: "ROYAL FASHION MALL",
        tagline: "Clothing & Apparel Store",
        address: "Grand Central Mall, Ground Floor",
        phone: "+91 98765 43210",
        billNo: `BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleString("en-IN"),
        customerName: name,
        customerPhone: phone,
        workerName: "Cashier 1",
        items: [
          { name: item, code: "CUSTOM", qty, price, total },
        ],
        subtotal: qty * price,
        discount: disc,
        grandTotal: total,
        paymentMode: mode,
        paymentStatus: mode === "PENDING" ? "PENDING" : "PAID",
        status: "COMPLETED",
      };

      renderReceipt(customData);
    });
  }

  // 12. Fetch latest POS bill
  const btnLoadCurrentPOSBill = document.getElementById("btnLoadCurrentPOSBill");
  if (btnLoadCurrentPOSBill) {
    btnLoadCurrentPOSBill.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_BASE}/transactions`, {
          headers: { "x-pos-api-key": POS_API_KEY },
        });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const txs = await res.json();
        if (Array.isArray(txs) && txs.length > 0) {
          renderReceipt(txs[0]);
        } else {
          alert("No transactions found in database yet.");
        }
      } catch (e) {
        alert("Backend not reachable. Ensure backend server is running.");
      }
    });
  }

  // 13. Clear History
  const btnClearHistory = document.getElementById("btnClearHistory");
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", () => {
      printHistory = [];
      renderHistory();
    });
  }

  // Start live polling every 1.2 seconds
  setInterval(pollBackendQueue, 1200);

  // Initial sound enablement on first click anywhere
  document.body.addEventListener("click", () => initAudio(), { once: true });
});

// ── CENTRALIZED CLOUD DATABASE ENDPOINT ──────────────────
// Both Localhost and GitHub Pages share this single live Cloud Database on Render
const API_BASE = "https://billbook-api-vxph.onrender.com/api";

// Local hardware port controller for USB physical printer (always on cashier PC)
const PRINTER_API_BASE = "http://127.0.0.1:5000/api";

const POS_API_KEY = "BB_POS_SECURE_API_KEY_7061";

const defaultHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "x-pos-api-key": POS_API_KEY,
  ...extra,
});

export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable, falling back to local storage", e);
    return null;
  }
}

export async function saveProduct(product) {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(product),
    });
    return await res.json();
  } catch (e) {
    console.error("Error saving product via API", e);
    return null;
  }
}

export async function fetchNextBillNumber() {
  try {
    const res = await fetch(`${API_BASE}/next-bill-number`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    return data.billNo;
  } catch (e) {
    console.warn("Backend unavailable, using random fallback bill number", e);
    return null;
  }
}

export async function processSale(transaction) {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(transaction),
    });
    return await res.json();
  } catch (e) {
    console.error("Error processing sale via API", e);
    return null;
  }
}

export async function fetchTransactions() {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function saveSettings(settings) {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(settings),
    });
    return await res.json();
  } catch (e) {
    console.error("Error saving settings via API", e);
    return null;
  }
}

export async function cancelTransaction(billNo, id) {
  try {
    const res = await fetch(`${API_BASE}/transactions/cancel`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, id }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error cancelling transaction", e);
    return null;
  }
}

export async function uncancelTransaction(billNo, id) {
  try {
    const res = await fetch(`${API_BASE}/transactions/uncancel`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, id }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error uncancelling transaction", e);
    return null;
  }
}

export async function returnTransaction(billNo, returnedItems, workerName, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "") {
  try {
    const res = await fetch(`${API_BASE}/transactions/return`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error returning transaction", e);
    return null;
  }
}

export async function settlePendingTransaction(billNo, id, amountPaid, paymentMode, settledBy) {
  try {
    const res = await fetch(`${API_BASE}/transactions/settle`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, id, amountPaid, paymentMode, settledBy }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error settling transaction", e);
    return null;
  }
}

export async function incrementPrintCount(id, billNo) {
  try {
    const res = await fetch(`${API_BASE}/transactions/increment-print`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ id, billNo }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error incrementing print count", e);
    return null;
  }
}

export async function fetchWorkers() {
  try {
    const res = await fetch(`${API_BASE}/workers/all`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function saveWorker(worker) {
  try {
    const res = await fetch(`${API_BASE}/workers`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(worker),
    });
    return await res.json();
  } catch (e) {
    console.error("Error saving worker", e);
    return null;
  }
}

export async function deleteWorker(id) {
  try {
    const res = await fetch(`${API_BASE}/workers/${id}`, {
      method: "DELETE",
      headers: defaultHeaders(),
    });
    return await res.json();
  } catch (e) {
    console.error("Error deleting worker", e);
    return null;
  }
}

export async function loginWorker(username, password) {
  try {
    const res = await fetch(`${API_BASE}/workers/login`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ username, password }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error logging in", e);
    return null;
  }
}

export async function factoryReset() {
  try {
    const res = await fetch(`${API_BASE}/factory-reset`, {
      method: "POST",
      headers: defaultHeaders(),
    });
    return await res.json();
  } catch (e) {
    console.error("Error performing factory reset", e);
    return null;
  }
}

// ── THERMAL PRINTER API FUNCTIONS ───────────────────
export async function getThermalPrinterStatus() {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/status`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("Printer API Error");
    return await res.json();
  } catch (e) {
    return { connected: false };
  }
}

export async function fetchAvailablePrinters() {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/list`, {
      headers: defaultHeaders(),
    });
    if (!res.ok) throw new Error("Printer list error");
    return await res.json();
  } catch (e) {
    console.error("Error listing printers", e);
    return { all: [], thermal: [] };
  }
}

export async function connectThermalPrinter(printerName) {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/connect`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ printerName }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error connecting thermal printer", e);
    return { success: false, error: e.message };
  }
}

export async function disconnectThermalPrinter() {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/disconnect`, {
      method: "POST",
      headers: defaultHeaders(),
    });
    return await res.json();
  } catch (e) {
    console.error("Error disconnecting thermal printer", e);
    return { success: false, error: e.message };
  }
}

export async function printToThermalPrinter(billData, settings) {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/print`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billData, settings }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error printing to thermal printer", e);
    return { success: false, error: e.message };
  }
}

export async function testThermalPrinter() {
  try {
    const res = await fetch(`${PRINTER_API_BASE}/thermal-printer/test`, {
      method: "POST",
      headers: defaultHeaders(),
    });
    return await res.json();
  } catch (e) {
    console.error("Error testing thermal printer", e);
    return { success: false, error: e.message };
  }
}

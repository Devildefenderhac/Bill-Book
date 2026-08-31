// ── DYNAMIC CENTRALIZED DATABASE ENDPOINT ──────────────────
// Automatically connects to local backend when developing on PC, or Render Cloud when deployed
export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:5000/api";
    }
  }
  return "https://billbook-api-vxph.onrender.com/api";
};

export const API_BASE = getApiBaseUrl();

// Local hardware port controller for USB physical printer (always on cashier PC)
const PRINTER_API_BASE = "http://127.0.0.1:5000/api";

const POS_API_KEY = "BB_POS_SECURE_API_KEY_7061";
const OFFLINE_QUEUE_KEY = "billbook_offline_queue";

const defaultHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "x-pos-api-key": POS_API_KEY,
  ...extra,
});

// Fast health ping to check cloud backend availability and prevent Render cold-sleep
export async function checkApiHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${getApiBaseUrl()}/health`, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Queue a transaction to be uploaded when cloud backend is online
export function enqueueOfflineTransaction(transaction) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    const exists = queue.some((tx) => tx.billNo === transaction.billNo);
    if (!exists) {
      queue.push({ ...transaction, _queuedAt: new Date().toISOString() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e) {
    console.warn("Failed to queue offline transaction:", e);
  }
}

// Get the count of pending offline transactions
export function getOfflineQueueCount() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    return queue.length;
  } catch (e) {
    return 0;
  }
}

// Sync all queued offline transactions to the cloud backend
export async function syncOfflineTransactions() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return { syncedCount: 0, remaining: 0 };
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return { syncedCount: 0, remaining: 0 };

    const remainingQueue = [];
    let syncedCount = 0;

    for (const tx of queue) {
      try {
        const res = await processSale(tx);
        if (res && (res.success !== false || res.alreadyExists)) {
          syncedCount++;
        } else {
          remainingQueue.push(tx);
        }
      } catch (err) {
        remainingQueue.push(tx);
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }

    return { syncedCount, remaining: remainingQueue.length };
  } catch (e) {
    console.error("Error syncing offline transactions:", e);
    return { syncedCount: 0, remaining: 0 };
  }
}

export async function fetchProducts() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${getApiBaseUrl()}/products`, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable, falling back to local storage", e);
    return null;
  }
}

export async function saveProduct(product) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/products`, {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${getApiBaseUrl()}/next-bill-number`, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`${getApiBaseUrl()}/transactions`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(transaction),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (errJson?.error && (errJson.error.includes("UNIQUE") || errJson.error.includes("already exists"))) {
        return { success: true, alreadyExists: true };
      }
      throw new Error(`HTTP ${res.status}: ${errJson?.error || "Error"}`);
    }
    return await res.json();
  } catch (e) {
    console.error("Error processing sale via API", e);
    return null;
  }
}

export async function fetchTransactions() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${getApiBaseUrl()}/transactions`, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function fetchSettings() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${getApiBaseUrl()}/settings`, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function saveSettings(settings) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/settings`, {
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

export async function returnTransaction(billNo, returnedItems, workerName, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "", refundTotal = 0) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/transactions/return`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode, refundTotal }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error returning transaction", e);
    return null;
  }
}

export async function settlePendingTransaction(billNo, id, amountPaid, paymentMode, settledBy) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/transactions/settle`, {
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
    const res = await fetch(`${getApiBaseUrl()}/transactions/increment-print`, {
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
    const res = await fetch(`${getApiBaseUrl()}/workers/all`, {
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

// ── CENTRALIZED CLOUD DATABASE & REAL-TIME INTERNET SYNC ENGINE ──────────────────
// Connects all 5 mall counters, Electron Desktop apps, and GitHub Pages to the same Central Cloud Server

export const DEFAULT_CLOUD_API_BASE = "https://billbook-api-vxph.onrender.com/api";
export const LOCAL_DEV_API_BASE = "http://127.0.0.1:5000/api";

const SERVER_URL_STORAGE_KEY = "billbook_custom_server_url";
const COUNTER_NAME_STORAGE_KEY = "billbook_current_counter";
const POS_API_KEY = "BB_POS_SECURE_API_KEY_7061";
const OFFLINE_QUEUE_KEY = "billbook_offline_queue";

// Get active Central Server URL (Custom configured cloud server or Default Render Cloud)
export const getApiBaseUrl = () => {
  if (typeof window === "undefined") return DEFAULT_CLOUD_API_BASE;
  try {
    const customUrl = localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, "");
    }
  } catch (e) {}
  return DEFAULT_CLOUD_API_BASE;
};

// Update or switch Central Server URL
export const setCustomServerUrl = (url) => {
  try {
    if (!url || url.trim() === "" || url.trim() === DEFAULT_CLOUD_API_BASE) {
      localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    } else {
      localStorage.setItem(SERVER_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ""));
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Reset Server URL to official Default Cloud Server
export const resetServerUrlToDefault = () => {
  try {
    localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    return DEFAULT_CLOUD_API_BASE;
  } catch (e) {
    return DEFAULT_CLOUD_API_BASE;
  }
};

// Counter Management: get and set this machine's counter tag (e.g. Counter 1, Counter 2, etc.)
export const getActiveCounter = () => {
  try {
    return localStorage.getItem(COUNTER_NAME_STORAGE_KEY) || "Counter 1";
  } catch (e) {
    return "Counter 1";
  }
};

export const setActiveCounter = (counterName) => {
  try {
    localStorage.setItem(COUNTER_NAME_STORAGE_KEY, counterName || "Counter 1");
  } catch (e) {}
};

export const API_BASE = getApiBaseUrl();

// Local hardware port controller for USB physical printer (cashier PC)
const PRINTER_API_BASE = "http://127.0.0.1:5000/api";

export const defaultHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "x-pos-api-key": POS_API_KEY,
  "x-counter-name": getActiveCounter(),
  ...extra,
});

// Fast health ping to check cloud backend availability and wake Render from cold-sleep
export async function checkApiHealth(targetUrl = null) {
  try {
    const url = targetUrl || `${getApiBaseUrl()}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: defaultHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Queue a transaction to be uploaded when internet / cloud backend is online
export function enqueueOfflineTransaction(transaction) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    const exists = queue.some((tx) => tx.billNo === transaction.billNo);
    if (!exists) {
      queue.push({
        ...transaction,
        counter: transaction.counter || getActiveCounter(),
        _queuedAt: new Date().toISOString(),
      });
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

// Sync all queued offline transactions directly to the central cloud server
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
        const res = await processSale(tx, true);
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

// ── FULL REAL-TIME CENTRAL CLOUD SYNCHRONIZATION ───────────────────
// Fetches fresh live dataset directly from the Central Cloud Server for all 5 systems & Owner Dashboard
export async function performFullCloudSync() {
  const targetApi = getApiBaseUrl();

  try {
    // 1. Drain any pending offline queue first
    await syncOfflineTransactions();

    // 2. Fetch live store dataset in parallel directly from Central Cloud Database
    const [cloudTxs, cloudProds, cloudWorkers, cloudSettings] = await Promise.all([
      fetch(`${targetApi}/transactions`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
      fetch(`${targetApi}/products`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
      fetch(`${targetApi}/workers/all`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
      fetch(`${targetApi}/settings`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
    ]);

    const isLive = cloudTxs !== null || cloudProds !== null;

    if (isLive) {
      return {
        success: true,
        totalTxs: cloudTxs?.length || 0,
        transactions: cloudTxs,
        products: cloudProds,
        workers: cloudWorkers,
        settings: cloudSettings,
        message: `☁️ Live Cloud Synced: All 5 Counter Bills & Inventory Synchronized!`,
      };
    }

    return {
      success: false,
      message: "⚠️ Cloud server reconnecting. Using local offline cache.",
    };
  } catch (error) {
    console.error("performFullCloudSync error:", error);
    return {
      success: false,
      error: error.message,
      message: "⚠️ Cloud server reconnecting. Using local offline cache.",
    };
  }
}


// ── PRODUCTS API ─────────────────────────────────────────
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
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error saving product via API", e);
    return null;
  }
}

export async function deleteProduct(id) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/products/${id}`, {
      method: "DELETE",
      headers: defaultHeaders(),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error deleting product", e);
    return null;
  }
}

// ── BILL NUMBER API ──────────────────────────────────────
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
    console.warn("Backend unavailable, using fallback bill number", e);
    return null;
  }
}

// ── TRANSACTIONS / SALES API ──────────────────────────────
export async function processSale(transaction, isSilentOffline = false) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const payload = {
      ...transaction,
      counter: transaction.counter || getActiveCounter(),
    };
    const res = await fetch(`${getApiBaseUrl()}/transactions`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(payload),
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
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error processing sale via API", e);
    if (!isSilentOffline) {
      enqueueOfflineTransaction(transaction);
    }
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

// ── SETTINGS API ─────────────────────────────────────────
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
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error saving settings via API", e);
    return null;
  }
}

// ── TRANSACTION STATUS MUTATIONS (CANCEL, RETURN, SETTLE) ──
export async function cancelTransaction(billNo, id) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/transactions/cancel`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, id }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error cancelling transaction", e);
    return null;
  }
}

export async function uncancelTransaction(billNo, id) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/transactions/uncancel`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify({ billNo, id }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error uncancelling transaction", e);
    return null;
  }
}

export async function returnTransaction(billNo, returnedItems, workerName, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "", refundTotal = 0) {
  try {
    const body = { billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode, refundTotal };
    const res = await fetch(`${getApiBaseUrl()}/transactions/return`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error returning transaction", e);
    return null;
  }
}

export async function settlePendingTransaction(billNo, id, amountPaid, paymentMode, settledBy) {
  try {
    const body = { billNo, id, amountPaid, paymentMode, settledBy };
    const res = await fetch(`${getApiBaseUrl()}/transactions/settle`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
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

// ── WORKERS API ──────────────────────────────────────────
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
    const res = await fetch(`${getApiBaseUrl()}/workers`, {
      method: "POST",
      headers: defaultHeaders(),
      body: JSON.stringify(worker),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error saving worker", e);
    return null;
  }
}

export async function deleteWorker(id) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/workers/${id}`, {
      method: "DELETE",
      headers: defaultHeaders(),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error deleting worker", e);
    return null;
  }
}

export async function loginWorker(username, password) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/workers/login`, {
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
    const res = await fetch(`${getApiBaseUrl()}/factory-reset`, {
      method: "POST",
      headers: defaultHeaders(),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Error performing factory reset", e);
    return null;
  }
}


// ── THERMAL PRINTER HARDWARE API ─────────────────────────
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

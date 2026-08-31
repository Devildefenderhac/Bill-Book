// ── DYNAMIC CENTRALIZED DATABASE & CLOUD SYNC ENGINE ──────────────────
// Automatically connects to local backend when developing on PC, or Render Cloud when deployed on GitHub Pages

export const LOCAL_API_BASE = "http://127.0.0.1:5000/api";
export const CLOUD_API_BASE = "https://billbook-api-vxph.onrender.com/api";

// Helper to determine if we are running in a local desktop / dev environment
export const isLocalEnvironment = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "" || window.location.protocol === "file:";
};

export const getApiBaseUrl = () => {
  if (isLocalEnvironment()) {
    return LOCAL_API_BASE;
  }
  return CLOUD_API_BASE;
};

export const API_BASE = getApiBaseUrl();

// Local hardware port controller for USB physical printer (always on cashier PC)
const PRINTER_API_BASE = "http://127.0.0.1:5000/api";

const POS_API_KEY = "BB_POS_SECURE_API_KEY_7061";
const OFFLINE_QUEUE_KEY = "billbook_offline_queue";

export const defaultHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "x-pos-api-key": POS_API_KEY,
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

// Background Cloud Replication: Sends mutations made on local PC to Render Cloud in background
async function replicateToCloud(endpoint, method = "POST", body = null) {
  if (!isLocalEnvironment()) return; // Only local PC needs to replicate to cloud
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    await fetch(`${CLOUD_API_BASE}${endpoint}`, {
      method,
      headers: defaultHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    console.warn(`[Cloud Replication] Background sync to ${endpoint} skipped/offline:`, err.message);
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

// ── FULL BI-DIRECTIONAL CLOUD SYNCHRONIZATION ───────────────────
// Synchronizes all local transactions, products, settings, and workers to Render Cloud
// so they immediately appear on GitHub Pages / remote devices
export async function performFullCloudSync() {
  const isLocal = isLocalEnvironment();

  try {
    // 1. If running on GitHub Pages (remote), simply fetch fresh live data from Cloud
    if (!isLocal) {
      const [cloudTxs, cloudProds, cloudWorkers, cloudSettings] = await Promise.all([
        fetch(`${CLOUD_API_BASE}/transactions`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
        fetch(`${CLOUD_API_BASE}/products`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
        fetch(`${CLOUD_API_BASE}/workers/all`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
        fetch(`${CLOUD_API_BASE}/settings`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
      ]);
      return {
        success: true,
        isLocal: false,
        totalTxs: cloudTxs?.length || 0,
        transactions: cloudTxs,
        products: cloudProds,
        workers: cloudWorkers,
        settings: cloudSettings,
        message: "☁️ Live Cloud Synced: Latest store data loaded!",
      };
    }

    // 2. Running on Localhost / Local PC: Perform full 2-way sync with Render Cloud
    // First wake up / verify cloud server
    const isCloudOnline = await checkApiHealth(`${CLOUD_API_BASE}/health`);
    if (!isCloudOnline) {
      console.warn("Cloud backend is sleeping or unreachable, retrying ping...");
    }

    // Fetch local and cloud datasets in parallel
    const [localTxs, localProds, localWorkers, localSettings, cloudTxs] = await Promise.all([
      fetch(`${LOCAL_API_BASE}/transactions`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => []),
      fetch(`${LOCAL_API_BASE}/products`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => []),
      fetch(`${LOCAL_API_BASE}/workers/all`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => []),
      fetch(`${LOCAL_API_BASE}/settings`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => null),
      fetch(`${CLOUD_API_BASE}/transactions`, { headers: defaultHeaders() }).then((r) => r.json()).catch(() => []),
    ]);

    const cloudBillSet = new Set((cloudTxs || []).map((t) => t.billNo));
    const localBillSet = new Set((localTxs || []).map((t) => t.billNo));

    let pushedTxCount = 0;
    let pulledTxCount = 0;

    // A. Push local transactions that are missing in Cloud
    const missingInCloud = (localTxs || []).filter((t) => !cloudBillSet.has(t.billNo));
    for (const tx of missingInCloud) {
      try {
        await fetch(`${CLOUD_API_BASE}/transactions`, {
          method: "POST",
          headers: defaultHeaders(),
          body: JSON.stringify(tx),
        });
        pushedTxCount++;
      } catch (err) {
        console.warn("Failed to push tx to cloud:", tx.billNo, err);
      }
    }

    // A2. Synchronize Status & Return / Refund / Cancel / Settle updates for existing transactions
    const existingInCloud = (localTxs || []).filter((t) => cloudBillSet.has(t.billNo));
    for (const localTx of existingInCloud) {
      const cloudTx = (cloudTxs || []).find((ct) => ct.billNo === localTx.billNo);
      if (!cloudTx) continue;

      const isLocalReturned = localTx.status === "RETURNED" || localTx.status === "PARTIALLY_RETURNED" || !!localTx.returnDetails;
      const isCloudReturned = cloudTx.status === "RETURNED" || cloudTx.status === "PARTIALLY_RETURNED" || !!cloudTx.returnDetails;
      const needsReturnSync = isLocalReturned && (!isCloudReturned || cloudTx.status !== localTx.status || (localTx.returnDetails && !cloudTx.returnDetails));

      if (needsReturnSync) {
        try {
          const retBody = {
            billNo: localTx.billNo,
            returnedItems: localTx.returnDetails?.returnedItems || (localTx.items || []).filter((i) => (i.returnedQty || 0) > 0 || (i.returnQty || 0) > 0),
            workerName: localTx.returnDetails?.returnedBy || localTx.workerName || "Store Owner",
            refundMode: localTx.returnDetails?.refundMode || localTx.refundMode || "CASH",
            upiRefundRef: localTx.returnDetails?.upiRefundRef || localTx.upiRefundRef || "",
            originalPaymentMode: localTx.returnDetails?.originalPaymentMode || localTx.paymentMode || "",
            refundTotal: localTx.returnDetails?.refundAmount || localTx.refundAmount || 0,
          };
          await fetch(`${CLOUD_API_BASE}/transactions/return`, {
            method: "POST",
            headers: defaultHeaders(),
            body: JSON.stringify(retBody),
          });
          pushedTxCount++;
        } catch (err) {
          console.warn("Failed to sync return state to cloud:", localTx.billNo, err);
        }
      } else if (localTx.status === "CANCELLED" && cloudTx.status !== "CANCELLED") {
        try {
          await fetch(`${CLOUD_API_BASE}/transactions/cancel`, {
            method: "POST",
            headers: defaultHeaders(),
            body: JSON.stringify({ billNo: localTx.billNo, id: localTx.id }),
          });
          pushedTxCount++;
        } catch (err) {}
      } else if (localTx.status === "COMPLETED" && cloudTx.status === "CANCELLED") {
        try {
          await fetch(`${CLOUD_API_BASE}/transactions/uncancel`, {
            method: "POST",
            headers: defaultHeaders(),
            body: JSON.stringify({ billNo: localTx.billNo, id: localTx.id }),
          });
          pushedTxCount++;
        } catch (err) {}
      } else if (Array.isArray(localTx.settledHistory) && localTx.settledHistory.length > ((cloudTx.settledHistory || []).length)) {
        // Sync pending udhar settlements
        for (const st of localTx.settledHistory) {
          try {
            await fetch(`${CLOUD_API_BASE}/transactions/settle`, {
              method: "POST",
              headers: defaultHeaders(),
              body: JSON.stringify({
                billNo: localTx.billNo,
                id: localTx.id,
                amountPaid: st.amount,
                paymentMode: st.paymentMode,
                settledBy: st.settledBy,
              }),
            });
            pushedTxCount++;
          } catch (err) {}
        }
      }
    }

    // B. Pull any Cloud transactions that are missing in Local DB
    const missingInLocal = (cloudTxs || []).filter((t) => !localBillSet.has(t.billNo));
    for (const tx of missingInLocal) {
      try {
        await fetch(`${LOCAL_API_BASE}/transactions`, {
          method: "POST",
          headers: defaultHeaders(),
          body: JSON.stringify(tx),
        });
        pulledTxCount++;
      } catch (err) {
        console.warn("Failed to pull tx from cloud:", tx.billNo, err);
      }
    }

    // C. Replicate Local Products to Cloud
    if (Array.isArray(localProds) && localProds.length > 0) {
      for (const prod of localProds) {
        try {
          await fetch(`${CLOUD_API_BASE}/products`, {
            method: "POST",
            headers: defaultHeaders(),
            body: JSON.stringify(prod),
          });
        } catch (e) {}
      }
    }

    // D. Replicate Local Workers to Cloud
    if (Array.isArray(localWorkers) && localWorkers.length > 0) {
      for (const worker of localWorkers) {
        try {
          await fetch(`${CLOUD_API_BASE}/workers`, {
            method: "POST",
            headers: defaultHeaders(),
            body: JSON.stringify(worker),
          });
        } catch (e) {}
      }
    }

    // E. Replicate Local Settings to Cloud
    if (localSettings) {
      try {
        await fetch(`${CLOUD_API_BASE}/settings`, {
          method: "POST",
          headers: defaultHeaders(),
          body: JSON.stringify(localSettings),
        });
      } catch (e) {}
    }

    const totalBills = (localTxs || []).length + pulledTxCount;
    return {
      success: true,
      isLocal: true,
      pushedTxCount,
      pulledTxCount,
      totalTxs: totalBills,
      message:
        pushedTxCount > 0
          ? `☁️ Live Cloud Synced: ${pushedTxCount} new bill${pushedTxCount === 1 ? "" : "s"} uploaded to GitHub Pages!`
          : `☁️ Live Cloud Synced: All ${totalBills} bills & inventory are up-to-date on GitHub Pages!`,
    };
  } catch (error) {
    console.error("performFullCloudSync error:", error);
    return {
      success: false,
      isLocal,
      error: error.message,
      message: "⚠️ Cloud sync error. Using local database.",
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
    // Replicate to cloud in background if running locally
    replicateToCloud("/products", "POST", product);
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
    replicateToCloud(`/products/${id}`, "DELETE");
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
    const data = await res.json();

    // Replicate transaction to cloud immediately in background
    replicateToCloud("/transactions", "POST", transaction);

    return data;
  } catch (e) {
    console.error("Error processing sale via API", e);
    // Queue transaction for offline sync
    enqueueOfflineTransaction(transaction);
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
    replicateToCloud("/settings", "POST", settings);
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
    replicateToCloud("/transactions/cancel", "POST", { billNo, id });
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
    replicateToCloud("/transactions/uncancel", "POST", { billNo, id });
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
    replicateToCloud("/transactions/return", "POST", body);
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
    replicateToCloud("/transactions/settle", "POST", body);
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
    replicateToCloud("/workers", "POST", worker);
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
    replicateToCloud(`/workers/${id}`, "DELETE");
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
    replicateToCloud("/factory-reset", "POST");
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

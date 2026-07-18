const API_BASE = "http://localhost:5000/api";

export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API_BASE}/next-bill-number`);
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API_BASE}/transactions`);
    if (!res.ok) throw new Error("API Error");
    return await res.json();
  } catch (e) {
    console.warn("Backend unavailable", e);
    return null;
  }
}

export async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return await res.json();
  } catch (e) {
    console.error("Error saving settings via API", e);
    return null;
  }
}

export async function cancelTransaction(billNo) {
  try {
    const res = await fetch(`${API_BASE}/transactions/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billNo }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error cancelling transaction", e);
    return null;
  }
}

export async function fetchWorkers() {
  try {
    const res = await fetch(`${API_BASE}/workers/all`);
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${API_BASE}/workers/${id}`, { method: "DELETE" });
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return await res.json();
  } catch (e) {
    console.error("Error logging in", e);
    return null;
  }
}

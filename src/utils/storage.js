import {
  INITIAL_STORE_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
} from "../data/initialData";

const KEYS = {
  SETTINGS: "billbook_settings_v1",
  PRODUCTS: "billbook_products_v1",
  TRANSACTIONS: "billbook_transactions_v1",
  BILL_COUNTER: "billbook_counter_v1",
};

// Storage helpers
export const getSettings = () => {
  try {
    const saved = localStorage.getItem(KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
  } catch (e) {
    console.error("Error reading settings", e);
    return INITIAL_STORE_SETTINGS;
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving settings", e);
  }
};

export const getProducts = () => {
  try {
    const saved = localStorage.getItem(KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  } catch (e) {
    console.error("Error reading products", e);
    return INITIAL_PRODUCTS;
  }
};

export const saveProducts = (products) => {
  try {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error("Error saving products", e);
  }
};

export const getTransactions = () => {
  try {
    const saved = localStorage.getItem(KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  } catch (e) {
    console.error("Error reading transactions", e);
    return INITIAL_TRANSACTIONS;
  }
};

export const saveTransactions = (transactions) => {
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error("Error saving transactions", e);
  }
};

// Auto-incrementing unique bill generator
export const generateNextBillNumber = () => {
  const settings = getSettings();
  const prefix = settings.billPrefix || "BILL-";

  const today = new Date();
  const dateStr =
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  try {
    const counterStr = localStorage.getItem(KEYS.BILL_COUNTER);
    let counterObj = counterStr ? JSON.parse(counterStr) : { date: dateStr, count: 2 };

    if (counterObj.date !== dateStr) {
      counterObj = { date: dateStr, count: 1 };
    } else {
      counterObj.count += 1;
    }

    localStorage.setItem(KEYS.BILL_COUNTER, JSON.stringify(counterObj));
    const formattedCount = String(counterObj.count).padStart(4, "0");
    return `${prefix}${dateStr}-${formattedCount}`;
  } catch (e) {
    const fallback = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${dateStr}-${fallback}`;
  }
};

// Add new transaction & update inventory stock automatically
export const processSaleTransaction = (transaction) => {
  const transactions = getTransactions();
  const products = getProducts();

  // Deduct stock for each purchased item
  const updatedProducts = products.map((prod) => {
    const cartItems = transaction.items.filter((i) => i.id === prod.id);
    if (cartItems.length > 0) {
      const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
      return {
        ...prod,
        stock: Math.max(0, prod.stock - totalQty),
      };
    }
    return prod;
  });

  saveProducts(updatedProducts);
  const updatedTransactions = [transaction, ...transactions];
  saveTransactions(updatedTransactions);

  return { updatedProducts, updatedTransactions };
};

// Full Data Backup Export
export const exportBackupJSON = () => {
  const data = {
    settings: getSettings(),
    products: getProducts(),
    transactions: getTransactions(),
    exportedAt: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `BillBook_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Full Data Import Restore
export const importBackupJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.settings) saveSettings(data.settings);
    if (data.products) saveProducts(data.products);
    if (data.transactions) saveTransactions(data.transactions);
    return true;
  } catch (e) {
    console.error("Failed to restore backup", e);
    return false;
  }
};

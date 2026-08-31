import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import BillingView from "./components/BillingView";
import OwnerDashboard from "./components/OwnerDashboard";
import PaymentModal from "./components/PaymentModal";
import PrintReceipt from "./components/PrintReceipt";
import LoginScreen from "./components/LoginScreen";
import WorkerHistoryModal from "./components/WorkerHistoryModal";
import PendingPaymentsView from "./components/PendingPaymentsView";
import MarketingStudio from "./components/MarketingStudio";
import BackupRestoreModal from "./components/BackupRestoreModal";
import {
  fetchProducts,
  saveProduct,
  fetchNextBillNumber,
  processSale,
  fetchTransactions,
  fetchSettings,
  saveSettings,
  cancelTransaction,
  uncancelTransaction,
  fetchWorkers,
  saveWorker,
  deleteWorker,
  returnTransaction,
  incrementPrintCount,
  getThermalPrinterStatus,
  connectThermalPrinter,
  disconnectThermalPrinter,
  printToThermalPrinter,
  testThermalPrinter,
} from "./utils/api";
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS } from "./data/initialData";
import { secureLocalStorage, decryptEncryptedObject } from "./utils/storageCrypto";

const DB_VERSION_KEY = "billbook_db_version";
const CURRENT_DB_VERSION = "2026_08_31_v5_decrypted_passwords";

// Automatically clear outdated browser local storage if database schema/seeds updated
function checkAndClearOldBrowserStorage() {
  try {
    const savedVersion = localStorage.getItem(DB_VERSION_KEY);
    if (savedVersion !== CURRENT_DB_VERSION) {
      localStorage.removeItem("billbook_workers");
      localStorage.removeItem("enc_billbook_workers");
      localStorage.removeItem("billbook_settings");
      localStorage.removeItem("enc_billbook_settings");
      localStorage.removeItem("billbook_products");
      localStorage.removeItem("enc_billbook_products");
      localStorage.removeItem("billbook_transactions");
      localStorage.removeItem("enc_billbook_transactions");
      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
    }
  } catch (e) {
    console.warn("Storage migration check error:", e);
  }
}

checkAndClearOldBrowserStorage();

export default function App() {
  const [activeTab, setActiveTab] = useState("billing");
  const [settings, setSettings] = useState(INITIAL_STORE_SETTINGS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState([]);
  const [workers, setWorkers] = useState(() => {
    return secureLocalStorage.getItem("billbook_workers", INITIAL_WORKERS);
  });
  const [currentUser, setCurrentUser] = useState(null);

  const [cart, setCart] = useState([]);
  const [currentBillNo, setCurrentBillNo] = useState("BILL-22072026-0001");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [billToPrint, setBillToPrint] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Thermal Printer state
  const [printerStatus, setPrinterStatus] = useState({ connected: false, printerName: "" });

  // Check thermal printer connection status
  const checkPrinterStatus = async () => {
    const status = await getThermalPrinterStatus();
    if (status) {
      setPrinterStatus({
        connected: !!status.connected,
        printerName: status.printerName || "",
      });
    }
  };

  // Toggle Printer connection (Connect / Disconnect)
  const handleTogglePrinter = async () => {
    if (printerStatus.connected) {
      const res = await disconnectThermalPrinter();
      setPrinterStatus({ connected: false, printerName: "" });
      alert("🔌 Thermal printer disconnected.");
    } else {
      const res = await connectThermalPrinter();
      if (res && res.success) {
        setPrinterStatus({ connected: true, printerName: res.printer || "Thermal Printer" });
        alert(`✅ Thermal Printer Connected Successfully!\nPrinter: ${res.printer || "BT-58D Thermal Printer"}`);
      } else {
        alert(`❌ Could not connect printer:\n${res?.error || "Printer not found. Make sure BT-58D is powered on and connected via USB."}`);
      }
    }
  };

  // Smart print function: attempts direct ESC/POS thermal printing first, falls back to system print dialog
  const triggerPrint = async (billData) => {
    setBillToPrint(billData);
    try {
      const res = await printToThermalPrinter(billData, settings);
      if (res && res.success) {
        return;
      } else if (res && res.error) {
        console.warn("Thermal print error:", res.error);
        alert(`⚠️ POS Thermal Printer Warning:\n${res.error}\n\nOpening system print window fallback...`);
      }
    } catch (err) {
      console.warn("Direct thermal print attempt failed, falling back to system dialog", err);
    }
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Load live data from Node.js SQLite backend
  const loadLiveData = async () => {
    const apiProducts = await fetchProducts();
    if (apiProducts) setProducts(apiProducts);

    const apiNextBill = await fetchNextBillNumber();
    if (apiNextBill) setCurrentBillNo(apiNextBill);

    const apiTx = await fetchTransactions();
    if (apiTx) setTransactions(apiTx);

    const apiSet = await fetchSettings();
    if (apiSet && Object.keys(apiSet).length > 0) setSettings(apiSet);

    const apiWorkers = await fetchWorkers();
    if (apiWorkers) setWorkers(apiWorkers);

    checkPrinterStatus();
  };

  useEffect(() => {
    (async () => {
      try {
        const decSettings = await decryptEncryptedObject(INITIAL_STORE_SETTINGS);
        const decWorkers = await decryptEncryptedObject(INITIAL_WORKERS);
        if (decSettings) {
          setSettings((prev) => {
            const hasEnc = Object.values(prev || {}).some(
              (v) => typeof v === "string" && v.startsWith("ENC::")
            );
            return hasEnc ? decSettings : { ...decSettings, ...prev };
          });
        }
        if (decWorkers) {
          setWorkers((prev) => {
            const hasEnc = (prev || []).some(
              (w) =>
                (typeof w?.name === "string" && w.name.startsWith("ENC::")) ||
                (typeof w?.counter === "string" && w.counter.startsWith("ENC::")) ||
                (typeof w?.phone === "string" && w.phone.startsWith("ENC::"))
            );
            return !prev || prev.length === 0 || hasEnc ? decWorkers : prev;
          });
        }
      } catch (e) {
        console.warn("Decryption on mount error:", e);
      }
    })();
    loadLiveData();
  }, []);

  const handleUpdateSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleAddProduct = async (newProd) => {
    setProducts((prev) => [newProd, ...prev]);
    await saveProduct(newProd);
  };

  const handleUpdateProduct = async (updatedProd) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    await saveProduct(updatedProd);
  };

  const handleSaveWorker = async (worker) => {
    let workerToSave = { ...worker };
    if (worker.password && String(worker.password).trim() !== "") {
      try {
        const buffer = new TextEncoder().encode(String(worker.password).trim());
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
        workerToSave.passwordHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch (e) {}
    }

    const res = await saveWorker(workerToSave);
    const finalWorker = res && res.success && res.worker ? { ...workerToSave, ...res.worker } : workerToSave;

    setWorkers((prev) => {
      const exists = (prev || []).find((w) => w.id === finalWorker.id);
      const updated = exists
        ? prev.map((w) => (w.id === finalWorker.id ? { ...w, ...finalWorker } : w))
        : [...(prev || []), finalWorker];
      secureLocalStorage.setItem("billbook_workers", updated);
      return updated;
    });

    return finalWorker;
  };

  const handleDeleteWorker = async (id) => {
    await deleteWorker(id);
    setWorkers((prev) => {
      const updated = (prev || []).filter((w) => w.id !== id);
      secureLocalStorage.setItem("billbook_workers", updated);
      return updated;
    });
  };

  const handleInitiatePayment = (cartSummary) => {
    setPendingCheckout(cartSummary);
    setIsPaymentModalOpen(true);
  };

  const handleCompleteSale = async ({
    paymentMode,
    paymentStatus,
    pendingAmount,
    advanceAmount,
    customerName,
    customerPhone,
    cashTendered,
    changeReturned,
    upiRefNo,
    cardRefNo,
    shouldPrint,
  }) => {
    if (!pendingCheckout) return;

    const finalCustomerName =
      (customerName && customerName.trim()) ||
      pendingCheckout.customerName ||
      (paymentMode === "PENDING" ? "Udhar Customer" : "Walk-in Customer");

    const finalCustomerPhone =
      (customerPhone && customerPhone.trim()) ||
      pendingCheckout.customerPhone ||
      "";

    const newTransaction = {
      billNo: currentBillNo,
      timestamp: new Date().toISOString(),
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      items: pendingCheckout.cart,
      subtotal: pendingCheckout.subtotal,
      discount: pendingCheckout.discount,
      grandTotal: pendingCheckout.grandTotal,
      paymentMode,
      paymentStatus: paymentStatus || (paymentMode === "PENDING" ? "PENDING" : "PAID"),
      pendingAmount:
        pendingAmount !== undefined
          ? pendingAmount
          : paymentMode === "PENDING"
          ? pendingCheckout.grandTotal
          : 0,
      advanceAmount: advanceAmount || 0,
      cashTendered,
      changeReturned,
      upiRefNo,
      cardRefNo,
      workerName: currentUser ? currentUser.name : "Store Owner (Admin)",
      status: "COMPLETED",
    };

    // Save transaction to Node.js backend
    const res = await processSale(newTransaction);
    if (res && res.products) {
      setProducts(res.products);
      if (res.transactions) setTransactions(res.transactions);
    } else {
      // Offline / GitHub Pages local storage fallback
      const updatedProducts = products.map((p) => {
        const cartItem = (pendingCheckout.cart || []).find((ci) => ci.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, (p.stock || 0) - (cartItem.qty || cartItem.quantity || 1)) };
        }
        return p;
      });
      setProducts(updatedProducts);
      secureLocalStorage.setItem("billbook_products", updatedProducts);

      const updatedTxs = [newTransaction, ...transactions];
      setTransactions(updatedTxs);
      secureLocalStorage.setItem("billbook_transactions", updatedTxs);
    }

    setBillToPrint(newTransaction);

    if (shouldPrint) {
      triggerPrint(newTransaction);
    }

    setCart([]);
    setIsPaymentModalOpen(false);
    setPendingCheckout(null);

    // Fetch next sequential bill number from backend or generate offline sequence
    const nextBill = await fetchNextBillNumber();
    if (nextBill) {
      setCurrentBillNo(nextBill);
    } else {
      const today = new Date();
      const d = String(today.getDate()).padStart(2, "0");
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const y = today.getFullYear();
      const count = (transactions.length + 2).toString().padStart(4, "0");
      setCurrentBillNo(`BILL-${d}${m}${y}-${count}`);
    }
  };

  const handleReprintBill = async (tx) => {
    const res = await incrementPrintCount(tx.id, tx.billNo);
    const updatedTx = res?.tx || { ...tx, printCount: (tx.printCount || 0) + 1 };
    loadLiveData();
    triggerPrint(updatedTx);
  };

  const handleCancelBill = async (billNoToCancel, idToCancel) => {
    await cancelTransaction(billNoToCancel, idToCancel);
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.billNo === billNoToCancel ? { ...t, status: "CANCELLED" } : t));
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    loadLiveData();
  };

  const handleUncancelBill = async (billNoToUncancel, idToUncancel) => {
    await uncancelTransaction(billNoToUncancel, idToUncancel);
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.billNo === billNoToUncancel ? { ...t, status: "COMPLETED" } : t));
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    loadLiveData();
  };

  const handleReturnBill = async (billNo, returnedItems, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "") => {
    const workerName = currentUser ? currentUser.name : "Store Owner (Admin)";
    const res = await returnTransaction(billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode);
    if (res && (res.originalTx || res.returnTx)) {
      triggerPrint(res.originalTx || res.returnTx);
    }
    setTransactions((prev) => {
      const updated = prev.map((t) => {
        if (t.billNo === billNo) {
          return { ...t, status: "RETURNED", returnDetails: returnedItems };
        }
        return t;
      });
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    loadLiveData();
  };

  const handleSwitchAccount = (user) => {
    setCurrentUser(user);
    setActiveTab("billing");
  };

  if (!currentUser) {
    return (
      <LoginScreen
        workers={workers}
        onLogin={(user) => {
          setCurrentUser(user);
          const isMasterAdmin = user.role === "master_admin";
          const isOwnerRole = isMasterAdmin || user.role === "owner" || user.role === "Admin" || user.role === "admin";
          setActiveTab(isOwnerRole ? "owner" : "billing");
        }}
      />
    );
  }

  const isMasterAdmin = currentUser?.role === "master_admin";

  return (
    <div className="app-container">
      <Header
        activeTab={isMasterAdmin ? "owner" : activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenSettings={() => setActiveTab("owner")}
        onOpenHistory={() => {
          setIsHistoryModalOpen(true);
        }}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        printerConnected={printerStatus.connected}
        printerName={printerStatus.printerName}
        onTogglePrinter={handleTogglePrinter}
      />

      <main className="main-content">
        {activeTab === "billing" && !isMasterAdmin ? (
          <BillingView
            products={products}
            cart={cart}
            setCart={setCart}
            currentBillNo={currentBillNo}
            onInitiatePayment={handleInitiatePayment}
            transactions={transactions}
            currentUser={currentUser}
            settings={settings}
            onCancelBill={handleCancelBill}
            onUncancelBill={handleUncancelBill}
            onReturnBill={handleReturnBill}
            onReprintBill={handleReprintBill}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            onNavigateTab={setActiveTab}
          />
        ) : activeTab === "marketing" ? (
          <MarketingStudio
            transactions={transactions}
            currentUser={currentUser}
            settings={settings}
          />
        ) : activeTab === "pending" ? (
          <PendingPaymentsView
            transactions={transactions}
            currentUser={currentUser}
            settings={settings}
            onReloadData={loadLiveData}
            onPrintSettlementBill={(settlementBillData) => {
              triggerPrint(settlementBillData);
            }}
          />
        ) : (
          <OwnerDashboard
            transactions={transactions}
            products={products}
            settings={settings}
            workers={workers}
            currentUser={currentUser}
            onUpdateSettings={handleUpdateSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onSaveWorker={handleSaveWorker}
            onDeleteWorker={handleDeleteWorker}
            onSwitchAccount={handleSwitchAccount}
            onReprintBill={handleReprintBill}
            onCancelBill={handleCancelBill}
            onUncancelBill={handleUncancelBill}
            onReturnBill={handleReturnBill}
            onReloadData={loadLiveData}
            onLogout={() => setCurrentUser(null)}
          />
        )}
      </main>

      {pendingCheckout && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          cartSummary={pendingCheckout}
          settings={settings}
          transactions={transactions}
          currentUser={currentUser}
          onCompleteSale={handleCompleteSale}
        />
      )}

      <PrintReceipt billData={billToPrint} settings={settings} transactions={transactions} />

      <WorkerHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        worker={currentUser}
        transactions={transactions}
        settings={settings}
        onReprintBill={handleReprintBill}
        onCancelBill={handleCancelBill}
        onUncancelBill={handleUncancelBill}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onReloadData={loadLiveData}
      />
    </div>
  );
}

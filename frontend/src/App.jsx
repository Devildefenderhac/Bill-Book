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
  checkApiHealth,
  syncOfflineTransactions,
  enqueueOfflineTransaction,
  getOfflineQueueCount,
  performFullCloudSync,
  isLocalEnvironment,
} from "./utils/api";
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS } from "./data/initialData";
import { secureLocalStorage, decryptEncryptedObject } from "./utils/storageCrypto";

const DB_VERSION_KEY = "billbook_db_version";
const CURRENT_DB_VERSION = "2026_08_31_v7_cloud_sync_fix";

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

  // Live Cloud Synchronization status
  const [syncState, setSyncState] = useState({
    status: "synced", // "synced" | "syncing" | "offline"
    lastSynced: null,
    queueCount: 0,
  });
  const isSyncingRef = React.useRef(false);

  // Floating sync notification toast
  const [syncToast, setSyncToast] = useState({ show: false, message: "", type: "info" });
  const toastTimeoutRef = React.useRef(null);

  const showSyncToast = (message, type = "success", duration = 3500) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSyncToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setSyncToast((prev) => ({ ...prev, show: false }));
    }, duration);
  };

  // Physical Thermal Printer state
  const [printerStatus, setPrinterStatus] = useState({ connected: false, printerName: "" });

  // Check thermal printer connection status
  const checkPrinterStatus = async () => {
    const status = await getThermalPrinterStatus();
    setPrinterStatus({
      connected: !!(status && status.connected),
      printerName: (status && status.connected && (status.model || status.printerName)) ? (status.model || status.printerName) : "",
    });
  };

  // Toggle Physical Printer connection (Connect / Disconnect)
  const handleTogglePrinter = async () => {
    if (printerStatus.connected) {
      try {
        await disconnectThermalPrinter();
      } catch (e) {}
      setPrinterStatus({ connected: false, printerName: "" });
    } else {
      try {
        const res = await connectThermalPrinter();
        if (res && res.success) {
          setPrinterStatus({ connected: true, printerName: res.printer || "POS Thermal Printer" });
          alert(`✅ Thermal Printer Connected!\nPrinter: ${res.printer || "USB ESC/POS Printer"}`);
        } else {
          alert(`❌ Printer not detected:\n${res?.error || "Please check USB cable / power and try again."}`);
        }
      } catch (e) {
        alert("⚠️ Thermal printer connection error. Please ensure printer service is running.");
      }
    }
  };

  // Smart print function: sends ESC/POS print commands directly to physical thermal printer, falls back to system dialog
  const triggerPrint = async (billData) => {
    setBillToPrint(billData);

    try {
      const res = await printToThermalPrinter(billData, settings);
      if (res && res.success) {
        return;
      }
    } catch (err) {
      console.warn("Direct thermal print attempt completed or fallback", err);
    }

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Load live data with bi-directional Cloud Sync support
  const loadLiveData = async (isSilent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (!isSilent) {
      setSyncState((prev) => ({ ...prev, status: "syncing" }));
    }

    try {
      // 1. Flush offline queue if items exist
      await syncOfflineTransactions();

      // 2. Perform bi-directional Cloud Sync when user manually triggers sync (or on initial load)
      if (!isSilent) {
        const syncRes = await performFullCloudSync();
        if (syncRes && syncRes.message) {
          showSyncToast(syncRes.message, syncRes.success ? "success" : "warning");
        }
      }

      // 3. Fetch fresh live data in parallel
      const [apiProducts, apiNextBill, apiTx, apiSet, apiWorkers] = await Promise.all([
        fetchProducts(),
        fetchNextBillNumber(),
        fetchTransactions(),
        fetchSettings(),
        fetchWorkers(),
      ]);

      const isBackendLive = apiTx !== null || apiProducts !== null;

      if (apiProducts) setProducts(apiProducts);
      if (apiNextBill) setCurrentBillNo(apiNextBill);
      if (apiTx) setTransactions(apiTx);
      if (apiSet && Object.keys(apiSet).length > 0) setSettings(apiSet);
      if (apiWorkers) setWorkers(apiWorkers);

      checkPrinterStatus();

      const queueCount = getOfflineQueueCount();
      setSyncState({
        status: isBackendLive ? "synced" : "offline",
        lastSynced: new Date(),
        queueCount,
      });
    } catch (e) {
      console.warn("Sync error:", e);
      setSyncState((prev) => ({ ...prev, status: "offline" }));
      if (!isSilent) {
        showSyncToast("⚠️ Connection issue. Using offline store data.", "warning");
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Initial decrypt on mount
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
  }, []);

  // Continuous background polling, background cloud sync, and keep-alive ping
  useEffect(() => {
    // 1. Initial live load
    loadLiveData(false);

    // 2. Real-time background sync loop (every 8 seconds)
    const pollInterval = setInterval(() => {
      loadLiveData(true);
    }, 8000);

    // 3. Background cloud sync loop for local cashier PC (every 30 seconds)
    const cloudSyncInterval = setInterval(() => {
      if (isLocalEnvironment()) {
        performFullCloudSync().catch(() => {});
      }
    }, 30000);

    // 4. Keep-alive ping to prevent Render cold start sleep (every 8 minutes)
    const keepAliveInterval = setInterval(() => {
      checkApiHealth();
    }, 8 * 60 * 1000);

    // 5. Instant refresh on window focus / tab visibility / network reconnect
    const handleFocus = () => loadLiveData(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadLiveData(true);
      }
    };
    const handleOnline = () => {
      loadLiveData(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(pollInterval);
      clearInterval(cloudSyncInterval);
      clearInterval(keepAliveInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
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
      setSyncState({
        status: "synced",
        lastSynced: new Date(),
        queueCount: getOfflineQueueCount(),
      });
    } else {
      // Offline / Render waking up fallback: queue transaction for auto-sync
      enqueueOfflineTransaction(newTransaction);

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

      setSyncState({
        status: "offline",
        lastSynced: new Date(),
        queueCount: getOfflineQueueCount(),
      });
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
    loadLiveData(true);
    triggerPrint(updatedTx);
  };

  const handleCancelBill = async (billNoToCancel, idToCancel) => {
    await cancelTransaction(billNoToCancel, idToCancel);
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.billNo === billNoToCancel ? { ...t, status: "CANCELLED" } : t));
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    if (isLocalEnvironment()) {
      performFullCloudSync().catch(() => {});
    }
    loadLiveData(true);
  };

  const handleUncancelBill = async (billNoToUncancel, idToUncancel) => {
    await uncancelTransaction(billNoToUncancel, idToUncancel);
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.billNo === billNoToUncancel ? { ...t, status: "COMPLETED" } : t));
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    if (isLocalEnvironment()) {
      performFullCloudSync().catch(() => {});
    }
    loadLiveData(true);
  };

  const handleReturnBill = async (billNo, returnedItems, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "", refundTotal = 0) => {
    const workerName = currentUser ? currentUser.name : "Store Owner (Admin)";

    const originalTx = transactions.find((t) => t.billNo === billNo);
    const totalBilledQty = (originalTx?.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    const totalReturnedQty = (returnedItems || []).reduce((s, i) => s + Number(i.returnQty || i.returnedQty || i.quantity || 1), 0);
    const returnStatus = totalReturnedQty >= totalBilledQty ? "RETURNED" : "PARTIALLY_RETURNED";

    const updatedItems = (originalTx?.items || []).map((item) => {
      const ret = (returnedItems || []).find((r) => r.id === item.id);
      return ret ? { ...item, returnedQty: Number(ret.returnQty || ret.returnedQty || 1) } : item;
    });

    const returnDetailsObj = {
      returnedItems,
      returnedBy: workerName,
      refundMode,
      upiRefundRef,
      originalPaymentMode,
      refundAmount: refundTotal,
      timestamp: new Date().toISOString(),
    };

    const res = await returnTransaction(billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode, refundTotal);

    const returnTxToPrint = res?.originalTx || res?.returnTx || {
      ...originalTx,
      status: returnStatus,
      items: updatedItems,
      returnDetails: returnDetailsObj,
      refundAmount: refundTotal,
      refundMode,
      upiRefundRef,
      originalPaymentMode,
    };

    triggerPrint(returnTxToPrint);

    setTransactions((prev) => {
      const updated = prev.map((t) => {
        if (t.billNo === billNo) {
          return {
            ...t,
            status: returnStatus,
            items: updatedItems,
            returnDetails: returnDetailsObj,
            refundAmount: refundTotal,
            refundMode,
            upiRefundRef,
            originalPaymentMode,
          };
        }
        return t;
      });
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });

    if (isLocalEnvironment()) {
      performFullCloudSync().catch(() => {});
    }
    loadLiveData(true);
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
        syncState={syncState}
        onManualSync={() => loadLiveData(false)}
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
            syncState={syncState}
            onManualSync={() => loadLiveData(false)}
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
            syncState={syncState}
            onManualSync={() => loadLiveData(false)}
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

      {syncToast.show && (
        <div className={`sync-floating-toast ${syncToast.type}`}>
          <div className="sync-toast-content">
            <span className="sync-toast-dot"></span>
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

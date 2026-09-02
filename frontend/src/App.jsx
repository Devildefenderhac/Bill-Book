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
  getEffectiveTxStatus,
  getTxRefundAmount,
} from "./utils/api";
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS } from "./data/initialData";
import { secureLocalStorage, decryptEncryptedObject } from "./utils/storageCrypto";

const DB_VERSION_KEY = "billbook_db_version";
const CURRENT_DB_VERSION = "2026_09_02_v8_permanent_sync";

// Safely track database version without wiping user data
function checkDatabaseVersion() {
  try {
    localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
  } catch (e) {
    console.warn("Version check notice:", e);
  }
}

checkDatabaseVersion();

export default function App() {
  const [activeTab, setActiveTab] = useState("billing");
  const [settings, setSettings] = useState(() => {
    return secureLocalStorage.getItem("billbook_settings", INITIAL_STORE_SETTINGS);
  });
  const [products, setProducts] = useState(() => {
    return secureLocalStorage.getItem("billbook_products", INITIAL_PRODUCTS);
  });
  const [transactions, setTransactions] = useState(() => {
    return secureLocalStorage.getItem("billbook_transactions", []);
  });
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

  // Authoritative Central Cloud Data Loader & Real-Time Sync Engine
  const loadLiveData = async (isSilent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (!isSilent) {
      setSyncState((prev) => ({ ...prev, status: "syncing" }));
    }

    try {
      // 1. Drain offline-created bills to Central Cloud Database if reconnected
      await syncOfflineTransactions();

      // 2. Fetch fresh live state from Central Cloud Database (Single Source of Truth)
      const [apiProducts, apiNextBill, apiTx, apiSet, apiWorkers] = await Promise.all([
        fetchProducts(),
        fetchNextBillNumber(),
        fetchTransactions(),
        fetchSettings(),
        fetchWorkers(),
      ]);

      const isBackendLive = apiTx !== null || apiProducts !== null || apiWorkers !== null;

      // 3. Central Cloud is the Master Source of Truth: update state & cache directly
      if (Array.isArray(apiWorkers)) {
        setWorkers(apiWorkers);
        secureLocalStorage.setItem("billbook_workers", apiWorkers);
      }

      if (Array.isArray(apiTx)) {
        const normalizedTx = apiTx.map((t) => ({
          ...t,
          status: getEffectiveTxStatus(t),
          refundAmount: getTxRefundAmount(t),
        }));
        setTransactions(normalizedTx);
        secureLocalStorage.setItem("billbook_transactions", normalizedTx);
      }

      if (Array.isArray(apiProducts)) {
        setProducts(apiProducts);
        secureLocalStorage.setItem("billbook_products", apiProducts);
      }

      if (apiNextBill) {
        setCurrentBillNo(apiNextBill);
      }

      if (apiSet && Object.keys(apiSet).length > 0) {
        setSettings(apiSet);
        secureLocalStorage.setItem("billbook_settings", apiSet);
      }

      checkPrinterStatus();

      const queueCount = getOfflineQueueCount();
      setSyncState({
        status: isBackendLive ? "synced" : "offline",
        lastSynced: new Date(),
        queueCount,
      });
    } catch (e) {
      console.warn("Live sync notice:", e);
      setSyncState((prev) => ({ ...prev, status: "offline" }));
      if (!isSilent) {
        showSyncToast("⚠️ Connection offline. Operating with local store data.", "warning");
      }
    } finally {
      isSyncingRef.current = false;
    }
  };


  // Continuous real-time polling across all mall systems & keep-alive ping
  useEffect(() => {
    // 1. Initial load
    loadLiveData(false);

    // 2. Real-time background sync loop (every 3.5 seconds across all 5 counters & Electron)
    const pollInterval = setInterval(() => {
      loadLiveData(true);
    }, 3500);

    // 3. Keep-alive ping to prevent Render cold start sleep (every 4 minutes)
    const keepAliveInterval = setInterval(() => {
      checkApiHealth();
    }, 4 * 60 * 1000);

    // 4. Instant refresh on window focus / tab visibility / network reconnect
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
      counter: currentUser?.counter || "Counter 1",
      status: "COMPLETED",
    };

    // Save transaction directly to Central Cloud Server
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
      const dateStr = `${d}${m}${y}`;
      const prefix = settings?.billPrefix || "BILL-";
      const pattern = `${prefix}${dateStr}-`;

      let maxSeq = 0;
      (transactions || []).forEach((t) => {
        if (t?.billNo && t.billNo.startsWith(pattern)) {
          const parts = t.billNo.split("-");
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      });
      setCurrentBillNo(`${prefix}${dateStr}-${String(maxSeq + 1).padStart(4, "0")}`);
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
    performFullCloudSync().catch(() => {});
    loadLiveData(true);
  };

  const handleUncancelBill = async (billNoToUncancel, idToUncancel) => {
    await uncancelTransaction(billNoToUncancel, idToUncancel);
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.billNo === billNoToUncancel ? { ...t, status: "COMPLETED" } : t));
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });
    performFullCloudSync().catch(() => {});
    loadLiveData(true);
  };

  const handleReturnBill = async (billNo, returnedItems, refundMode = "CASH", upiRefundRef = "", originalPaymentMode = "", refundTotal = 0) => {
    const workerName = currentUser ? currentUser.name : "Store Owner (Admin)";

    const prevReturnedList = Array.isArray(originalTx.returnDetails?.returnedItems) ? originalTx.returnDetails.returnedItems : [];

    const updatedItems = (originalTx.items || []).map((item, idx) => {
      const prevRetQty = Number(item.returnedQty || 0) ||
        Number(prevReturnedList.find((r) =>
          (r.itemIndex !== undefined && Number(r.itemIndex) === idx) ||
          (r.id && item.id && String(r.id) === String(item.id))
        )?.returnedQty || prevReturnedList.find((r) =>
          (r.itemIndex !== undefined && Number(r.itemIndex) === idx) ||
          (r.id && item.id && String(r.id) === String(item.id))
        )?.returnQty || 0);

      const ret = (returnedItems || []).find((r) => {
        if (r.itemIndex !== undefined && r.itemIndex !== null) {
          return Number(r.itemIndex) === idx;
        }
        if (r.id && item.id && String(r.id) === String(item.id)) {
          return true;
        }
        return false;
      });

      if (ret) {
        const addedRetQty = Number(ret.returnQty || ret.returnedQty || 1);
        return {
          ...item,
          returnedQty: Math.min(Number(item.qty || item.quantity || 1), prevRetQty + addedRetQty),
        };
      }
      return {
        ...item,
        returnedQty: prevRetQty,
      };
    });

    const totalBilledQty = (originalTx.items || []).reduce((s, i) => s + Number(i.qty || i.quantity || 1), 0);
    const totalAllReturnedQty = updatedItems.reduce((s, i) => s + Number(i.returnedQty || 0), 0);
    const returnStatus =
      totalAllReturnedQty >= totalBilledQty
        ? "RETURNED"
        : totalAllReturnedQty > 0
        ? "PARTIALLY_RETURNED"
        : (originalTx.status || "COMPLETED");

    const sessionRefund = Number(refundTotal) || (returnedItems || []).reduce((s, i) => {
      const rQty = Number(i.returnQty || i.returnedQty || 1);
      const rPrice = Number(i.netUnitPrice || i.netPrice || i.price || 0);
      return s + (rQty * rPrice);
    }, 0);

    const prevRefundAmount = Number(originalTx.refundAmount || originalTx.returnDetails?.refundAmount || 0);
    const cumulativeRefund = prevRefundAmount + sessionRefund;

    const combinedReturnedItems = [...prevReturnedList];
    (returnedItems || []).forEach((newRet) => {
      const existingIdx = combinedReturnedItems.findIndex((r) =>
        (r.itemIndex !== undefined && newRet.itemIndex !== undefined && Number(r.itemIndex) === Number(newRet.itemIndex)) ||
        (r.id && newRet.id && String(r.id) === String(newRet.id))
      );
      if (existingIdx >= 0) {
        const prev = combinedReturnedItems[existingIdx];
        combinedReturnedItems[existingIdx] = {
          ...prev,
          returnQty: Number(prev.returnQty || prev.returnedQty || 0) + Number(newRet.returnQty || newRet.returnedQty || 1),
          returnedQty: Number(prev.returnedQty || prev.returnQty || 0) + Number(newRet.returnedQty || newRet.returnQty || 1),
        };
      } else {
        combinedReturnedItems.push(newRet);
      }
    });

    const returnDetailsObj = {
      returnedItems: combinedReturnedItems,
      lastReturnedItems: returnedItems,
      returnedBy: workerName,
      refundMode,
      upiRefundRef,
      originalPaymentMode,
      sessionRefundAmount: sessionRefund,
      refundAmount: cumulativeRefund,
      timestamp: new Date().toISOString(),
    };

    let newPendingAmount = originalTx.pendingAmount;
    let newPaymentStatus = originalTx.paymentStatus;
    if (
      originalTx.paymentStatus === "PENDING" ||
      originalTx.paymentStatus === "PARTIALLY_PAID" ||
      originalTx.paymentMode === "PENDING" ||
      (originalTx.pendingAmount !== undefined && originalTx.pendingAmount > 0)
    ) {
      const currentPending = Number(originalTx.pendingAmount !== undefined ? originalTx.pendingAmount : originalTx.grandTotal) || 0;
      newPendingAmount = Math.max(0, currentPending - sessionRefund);
      if (newPendingAmount === 0) {
        newPaymentStatus = "PAID";
      }
    }

    const res = await returnTransaction(billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode, sessionRefund);

    const returnTxToPrint = res?.originalTx || res?.returnTx || {
      ...originalTx,
      status: returnStatus,
      items: updatedItems,
      returnDetails: returnDetailsObj,
      refundAmount: cumulativeRefund,
      sessionRefundAmount: sessionRefund,
      refundMode,
      upiRefundRef,
      originalPaymentMode,
      pendingAmount: newPendingAmount,
      paymentStatus: newPaymentStatus,
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
            refundAmount: cumulativeRefund,
            sessionRefundAmount: sessionRefund,
            refundMode,
            upiRefundRef,
            originalPaymentMode,
            pendingAmount: newPendingAmount,
            paymentStatus: newPaymentStatus,
          };
        }
        return t;
      });
      secureLocalStorage.setItem("billbook_transactions", updated);
      return updated;
    });

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

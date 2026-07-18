import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import BillingView from "./components/BillingView";
import OwnerDashboard from "./components/OwnerDashboard";
import PaymentModal from "./components/PaymentModal";
import PrintReceipt from "./components/PrintReceipt";
import LoginScreen from "./components/LoginScreen";
import {
  fetchProducts,
  saveProduct,
  fetchNextBillNumber,
  processSale,
  fetchTransactions,
  fetchSettings,
  saveSettings,
  cancelTransaction,
  fetchWorkers,
  saveWorker,
  deleteWorker,
} from "./utils/api";
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS } from "./data/initialData";

export default function App() {
  const [activeTab, setActiveTab] = useState("billing");
  const [settings, setSettings] = useState(INITIAL_STORE_SETTINGS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [transactions, setTransactions] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [cart, setCart] = useState([]);
  const [currentBillNo, setCurrentBillNo] = useState("BILL-20260718-0001");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [billToPrint, setBillToPrint] = useState(null);

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
  };

  useEffect(() => {
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
    const res = await saveWorker(worker);
    if (res && res.success) {
      setWorkers((prev) => {
        const exists = prev.find((w) => w.id === res.worker.id);
        if (exists) return prev.map((w) => (w.id === res.worker.id ? res.worker : w));
        return [...prev, res.worker];
      });
    }
  };

  const handleDeleteWorker = async (id) => {
    const res = await deleteWorker(id);
    if (res && res.success) {
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const handleInitiatePayment = (cartSummary) => {
    setPendingCheckout(cartSummary);
    setIsPaymentModalOpen(true);
  };

  const handleCompleteSale = async ({
    paymentMode,
    cashTendered,
    changeReturned,
    upiRefNo,
    cardRefNo,
    shouldPrint,
  }) => {
    if (!pendingCheckout) return;

    const newTransaction = {
      billNo: currentBillNo,
      timestamp: new Date().toISOString(),
      customerName: pendingCheckout.customerName,
      customerPhone: pendingCheckout.customerPhone,
      items: pendingCheckout.cart,
      subtotal: pendingCheckout.subtotal,
      discount: pendingCheckout.discount,
      grandTotal: pendingCheckout.grandTotal,
      paymentMode,
      cashTendered,
      changeReturned,
      upiRefNo,
      cardRefNo,
      workerName: currentUser ? currentUser.name : "Cashier Counter 1",
      status: "COMPLETED",
    };

    // Save transaction to Node.js backend
    const res = await processSale(newTransaction);
    if (res && res.products) {
      setProducts(res.products);
      if (res.transactions) setTransactions(res.transactions);
    }

    setBillToPrint(newTransaction);

    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 300);
    }

    setCart([]);
    setIsPaymentModalOpen(false);
    setPendingCheckout(null);

    // Fetch next sequential bill number from backend
    const nextBill = await fetchNextBillNumber();
    if (nextBill) setCurrentBillNo(nextBill);
  };

  const handleReprintBill = (tx) => {
    setBillToPrint(tx);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleCancelBill = async (billNoToCancel) => {
    await cancelTransaction(billNoToCancel);
    loadLiveData();
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          setActiveTab(user.role === "owner" ? "owner" : "billing");
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenSettings={() => setActiveTab("owner")}
      />

      <main className="main-content">
        {activeTab === "billing" ? (
          <BillingView
            products={products}
            cart={cart}
            setCart={setCart}
            currentBillNo={currentBillNo}
            onInitiatePayment={handleInitiatePayment}
          />
        ) : (
          <OwnerDashboard
            transactions={transactions}
            products={products}
            settings={settings}
            workers={workers}
            onUpdateSettings={handleUpdateSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onSaveWorker={handleSaveWorker}
            onDeleteWorker={handleDeleteWorker}
            onReprintBill={handleReprintBill}
            onCancelBill={handleCancelBill}
            onReloadData={loadLiveData}
          />
        )}
      </main>

      {pendingCheckout && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          cartSummary={pendingCheckout}
          settings={settings}
          onCompleteSale={handleCompleteSale}
        />
      )}

      <PrintReceipt billData={billToPrint} settings={settings} />
    </div>
  );
}

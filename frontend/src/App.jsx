import React, { useState, useEffect } from 'react';
import TrackerHome from './components/TrackerHome.jsx';
import ValuationDetail from './components/ValuationDetail.jsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://valuation-scenario-api.onrender.com";

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' vs 'all'
  const [selectedStockTicker, setSelectedStockTicker] = useState(null);
  const [selectedStockData, setSelectedStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load companies when tab changes
  useEffect(() => {
    fetchCompanies(activeTab);
  }, [activeTab]);

  const fetchCompanies = async (tab) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/companies?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error("Failed to load companies:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStock = async (ticker) => {
    setSelectedStockTicker(ticker);
    try {
      const res = await fetch(`${API_BASE}/api/stock/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStockData(data);
      }
    } catch (e) {
      console.error("Error retrieving stock model:", e);
    }
  };

  const handleSaveStock = async (stockRecord) => {
    try {
      await fetch(`${API_BASE}/api/stock/${stockRecord.ticker}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockRecord)
      });
      fetchCompanies(activeTab);
    } catch (e) {
      console.error("Failed to save stock:", e);
    }
  };

  const handleFetchLive = async (ticker) => {
    try {
      const res = await fetch(`${API_BASE}/api/stock/${ticker}/fetch`, { method: 'POST' });
      if (res.ok) {
        const refreshed = await res.json();
        setSelectedStockData(refreshed);
      }
    } catch (e) {
      console.error("Failed live scrape:", e);
    }
  };

  const handleSaveComment = async (ticker, comment) => {
    try {
      await fetch(`${API_BASE}/api/stock/${ticker}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
      setCompanies(prev => prev.map(c => c.ticker === ticker ? { ...c, comment } : c));
    } catch (e) {
      console.error("Failed to update comment:", e);
    }
  };

  if (selectedStockTicker && selectedStockData) {
    return (
      <ValuationDetail
        stock={selectedStockData}
        onBack={() => {
          setSelectedStockTicker(null);
          setSelectedStockData(null);
        }}
        onSaveStock={handleSaveStock}
        onFetchLive={handleFetchLive}
      />
    );
  }

  return (
    <TrackerHome
      companies={companies}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSelectStock={handleSelectStock}
      onSaveComment={handleSaveComment}
    />
  );
}

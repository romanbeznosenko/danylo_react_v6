import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import DatabaseTiresPage from './pages/DatabaseTiresPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/database" element={<DatabaseTiresPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
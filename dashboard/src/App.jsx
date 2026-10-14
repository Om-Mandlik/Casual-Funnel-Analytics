import React, { useState } from 'react';
import Sessions from './Sessions.jsx';
import Heatmap from './Heatmap.jsx';

export default function App() {
  const [view, setView] = useState('sessions');

  return (
    <div className="app">
      <header className="topbar">
        <h1>Session track</h1>
        <nav role="tablist" aria-label="Dashboard views">
          <button role="tab" aria-selected={view === 'sessions'} onClick={() => setView('sessions')}>
            Sessions
          </button>
          <button role="tab" aria-selected={view === 'heatmap'} onClick={() => setView('heatmap')}>
            Click heatmap
          </button>
        </nav>
      </header>
      <main>{view === 'sessions' ? <Sessions /> : <Heatmap />}</main>
    </div>
  );
}

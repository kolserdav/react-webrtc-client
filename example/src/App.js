import React from 'react';
import './App.css';

// Import your package as library, need change @kolserdav/react-lib no custom package name
const Component = React.lazy(() => import('@kolserdav/react-webrtc-client'));

function App() {
  return (
    <div className="App">
      <Component />
    </div>
  );
}

export default App;

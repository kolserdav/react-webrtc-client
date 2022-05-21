import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Router from './components/Router/Router';

/**
 * Main component of library
 */

interface MainProps {
  test?: boolean;
}

function Main({ test }: MainProps) {
  return (
    <BrowserRouter>
      <Router port={9000} host="localhost" path="/" />
    </BrowserRouter>
  );
}

Main.defaultProps = {
  test: false,
};

export default Main;

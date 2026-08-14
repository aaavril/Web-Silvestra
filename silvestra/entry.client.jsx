// ============================================================
// SILVESTRA — entrada del cliente
// ------------------------------------------------------------
// El HTML ya viene renderizado desde el build (scripts/prerender.mjs),
// asi que aca se hidrata en vez de montar de cero.
// ============================================================

import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './app.jsx';

const root = document.getElementById('root');
if (root) hydrateRoot(root, <App />);

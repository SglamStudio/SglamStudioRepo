import express from 'express';
import { createApp } from './server/index.js';

// Vercel detecta esta exportación y ejecuta toda la API Express
// como una única función. En local, `npm start` sigue usando server/index.js.
export default createApp(express());

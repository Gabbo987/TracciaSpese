// ==========================================================
// MAIN — avvio dell'app: collega le funzionalità allo scheletro.
// Per aggiungere una funzionalità: importala e inizializzala qui.
// ==========================================================
import * as store from './core/store.js';
import { ensureColors } from './core/colors.js';
import { initTabs } from './ui/tabs.js';
import { initExpenseForm } from './features/expense-form.js';
import { initExpenseList } from './features/expense-list.js';
import { initStats } from './features/stats.js';
import { initSettings } from './features/settings.js';

ensureColors(store.getAll().map(e => e.category));

initTabs();
initExpenseForm();
initExpenseList(document.getElementById('tab-spese'));
initStats(document.getElementById('tab-stats'));
initSettings(document.getElementById('tab-settings'));

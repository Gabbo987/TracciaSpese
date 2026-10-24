# Traccia Spese

Web app per tracciare le spese personali e capire dove va il denaro.
Funziona su GitHub Pages, senza librerie esterne e senza passaggi di build.
I dati restano solo sul dispositivo (localStorage).

## Struttura

```
index.html              scheletro: header, sezioni vuote, tab bar
css/
  base.css              design system condiviso (colori, tema scuro, componenti)
  spese.css             stili della schermata Spese
  stats.css             stili di Statistiche e grafici
icons/
  apple-touch-icon.png  icona per la Home di iPhone
js/
  main.js               avvio: collega le funzionalità
  core/                 NUCLEO — si tocca solo per cambiamenti strutturali
    store.js            dati: lettura, scrittura, notifiche
    format.js           importi, date, utility
    colors.js           colore stabile per categoria
    periods.js          filtri temporali
  ui/                   COMPONENTI riutilizzabili
    tabs.js             navigazione tra le schermate
    modal.js            finestra che sale dal basso
    autocomplete.js     suggerimenti sotto un campo
    components.js       chip, etichette, stati vuoti
    line-chart.js       grafico a linea in SVG
  features/             FUNZIONALITÀ — file brevi, si modificano spesso
    expense-form.js     aggiungi / modifica / elimina una spesa
    expense-list.js     schermata Spese
    stats.js            schermata Statistiche
    trend.js            grafico dell'andamento nel tempo
    settings.js         schermata Impostazioni
```

## Regole

1. **I dati passano solo da `core/store.js`.** Nessun altro file usa localStorage per le spese.
2. **Le schermate si aggiornano da sole** iscrivendosi con `store.subscribe(...)`: chi modifica i dati non deve sapere chi li mostra.
3. **Le dipendenze vanno in una direzione**: `features` → `ui` → `core`. Il nucleo non importa mai dalle funzionalità.
4. **Una funzionalità = un file** in `features/` (più eventuali stili). Riempie da sé la propria sezione.
5. **Le chiavi `spese_v1` e `catColors_v1` non si cambiano**: sono dove stanno i dati salvati.

## Aggiungere una funzionalità

1. Crea `js/features/nome.js` con una funzione `initNome(container)`.
2. Se serve una nuova schermata, aggiungi una `<section>` e un bottone nella tab bar di `index.html`.
3. Importala e chiamala in `js/main.js`.

## Provarla sul computer

I moduli JavaScript non funzionano aprendo `index.html` con un doppio clic.
Serve un piccolo server locale nella cartella del progetto:

```
python3 -m http.server
```

poi apri http://localhost:8000. Su GitHub Pages funziona direttamente.

# Upgrade Next 16 — fase 2: componenti client e lint (Sprint 8)

Data: 2026-11-25. Branch `chore/upgrade-next-16`.

## File modificati
- `components/dashboard/mobile-nav.tsx`: la chiusura del menu al cambio rotta non usa più un `useEffect` con `setOpen(false)` (regola `react-hooks/set-state-in-effect`). Ora si usa il pattern React "adjusting state while rendering": si confronta `pathname` con quello precedente tenuto in stato e si chiude nello stesso render. Comportamento invariato.
- `components/invite/invite-card.tsx`: `url` e `canShare` (letti da `window.location.origin` e `navigator.share`) passano da `useEffect` + `useState` a `useSyncExternalStore` con snapshot server `""` / `false`. SSR e idratazione rendono gli stessi valori di prima; dopo il mount il client legge quelli reali.
- `components/pwa/install-prompt.tsx`: la lettura di `localStorage` al mount non è più in un effect. `checked` deriva da `useSyncExternalStore` (false su server/idratazione, true sul client); il rifiuto salvato si legge con `useMemo` solo quando `checked` è true; il rifiuto della sessione corrente è in `dismissedNow`. Il banner continua a rendere `null` fino alla lettura, nessun hydration mismatch.

La regola non è stata disattivata.

## Verifica compatibilità React 19 (lettura del codice)
- `forwardRef` + `useImperativeHandle` in `subscription-form.tsx`: ancora supportati in React 19 (deprecazione futura, nessun warning). Lasciati invariati per non fare refactoring non richiesti.
- `useRef<T>(null)` in `invite-member-form.tsx` e `subscription-scanner-form.tsx`: già con argomento, compatibili con i tipi React 19.
- Nessun uso di `defaultProps`, `propTypes`, `findDOMNode`, `ReactDOM.render`, `useFormState`.

## Librerie UI (peer dependency, installate)
- recharts 3.10.1: peer react/react-dom/react-is fino a ^19; react-is installato 19.3.1. OK.
- sonner 2.0.7: peer ^18 || ^19. OK.
- react-dropzone 15.0.0: peer react >= 16.8. OK.
- qrcode.react 4.2.0: peer fino a ^19. OK.
- lucide-react 0.400.0: peer fino a ^19. OK.
Nessuna libreria aggiornata; nessun warning di peer dependency da pnpm (solo avviso engine: node v25 locale contro engines 24.x).

## Verifica
- `npx tsc --noEmit`: pulito.
- `pnpm run lint`: pulito (0 errori).
- `npx vitest run`: 290/290.
- `npx next build`: OK.
- `pnpm build`: non eseguito (deroga dell'utente alla Parte IV).

## Da collaudare a runtime
Grafico (recharts), scanner (react-dropzone + ref del form), QR (qrcode.react), toast (sonner), banner PWA (comparsa, rifiuto 30 giorni, assenza di flash), tendina mobile (chiusura al cambio rotta, Esc), pagina /invite (URL e pulsante Condividi dopo il mount).

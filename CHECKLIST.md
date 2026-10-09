# Wavo — Checklist de entrega

Todo lo marcado como hecho se ejecutó de verdad el 2026-10-09 contra Stellar **Testnet**. Los enlaces apuntan a [stellar.expert](https://stellar.expert/explorer/testnet). Nada de esta lista es simulado.

## Despliegue en Testnet

| Elemento | Valor |
|---|---|
| Contrato `wavo_rewards` | [`CAI46OBJ2WKRIGWQRYENLXEWITNQJ7CIAWTBI4BWD7RU7FQFTPXKGKF4`](https://stellar.expert/explorer/testnet/contract/CAI46OBJ2WKRIGWQRYENLXEWITNQJ7CIAWTBI4BWD7RU7FQFTPXKGKF4) |
| WASM hash | `90672b523a2eeecf75412617b9ab1bede9ce3621f73c2263aa0b5fda958d9a0f` |
| Token (SAC XLM nativo) | [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| Admin del contrato | [`GCSQORBFBPPI2YDSZ63UFUGRC56WRXDXIA575ZZ75KSIYV5QJHHUJQ7A`](https://stellar.expert/explorer/testnet/account/GCSQORBFBPPI2YDSZ63UFUGRC56WRXDXIA575ZZ75KSIYV5QJHHUJQ7A) |
| Marca (owner de campañas) | [`GC5ZDVYODTNR6GVUSFLVQR3A4C5DVCYYJBHK7ZRWR476UXHPLEE6UGLY`](https://stellar.expert/explorer/testnet/account/GC5ZDVYODTNR6GVUSFLVQR3A4C5DVCYYJBHK7ZRWR476UXHPLEE6UGLY) |
| Creadora 1 (Ana) | [`GCKTEK6KZ7ISJL33J4TV4PECMELKA7E67IVFJ3NC66MAFBYJP2DPGU2O`](https://stellar.expert/explorer/testnet/account/GCKTEK6KZ7ISJL33J4TV4PECMELKA7E67IVFJ3NC66MAFBYJP2DPGU2O) |
| Creador 2 (Bruno) | [`GCFALVRUZCESIXOJ2EWGW3OGZR5ZSMWMKU7LSBGVNDOBXUCXZDNWLJB2`](https://stellar.expert/explorer/testnet/account/GCFALVRUZCESIXOJ2EWGW3OGZR5ZSMWMKU7LSBGVNDOBXUCXZDNWLJB2) |

### Transacciones

| Paso | Hash |
|---|---|
| Subida del WASM | [`6e26e862…c719c040`](https://stellar.expert/explorer/testnet/tx/6e26e8626b3ba7e4b6117d3dd85d31dc44dc1c5e68f267894995c06cc719c040) |
| Deploy del contrato | [`5db95d52…cd5452b8`](https://stellar.expert/explorer/testnet/tx/5db95d52119fdd5edfdc2785ff326ba4975e0d1921e122276de43590cd5452b8) |
| `initialize` | [`41c9d786…81d804a1e`](https://stellar.expert/explorer/testnet/tx/41c9d786a85e9b6b126881dbea9253acd74578f201bf7b72167ba4381d804a1e) |
| Campaña #1 `create_campaign` | [`15f350d0…2d73420f`](https://stellar.expert/explorer/testnet/tx/15f350d0471f54e1acb18fba9d8fa51cefc30cd4df1abb3a9e9ea65f2d73420f) |
| Campaña #1 `fund_campaign` (100 XLM) | [`375690e3…77e5624d`](https://stellar.expert/explorer/testnet/tx/375690e3cec6f2798c19b9229c2ef7cff9d98464fa798273ce0c33a577e5624d) |
| **Pago desde la app: Ana 20 XLM** (campaña #1) | [`fc28672a…544dc490`](https://stellar.expert/explorer/testnet/tx/fc28672a0df351730afe98abf2411fe13d79b8c797119876e731af8a544dc490) |
| **Pago desde la app: Bruno 15 XLM** (campaña #1) | [`5932bf22…18861e62`](https://stellar.expert/explorer/testnet/tx/5932bf220576b5d141496be292f418887ec6793f21a0af6515a88ad718861e62) |
| Campaña #2 `create_campaign` | [`12650604…2f3b4076`](https://stellar.expert/explorer/testnet/tx/126506042329aa7307fab2c13fe18cf195cfb2413d7a805e4a0fdc596f4b3076) |
| Campaña #2 `fund_campaign` (10 XLM) | [`541cbda6…41d7e678`](https://stellar.expert/explorer/testnet/tx/541cbda60a27a7e30f8ceed781f0e8adbc9182dec22984e287d2a86341d7e678) |
| Campaña #2 pago por CLI (1 XLM a Ana) | [`08282cad…fb8f2989`](https://stellar.expert/explorer/testnet/tx/08282cad5c463e92382094d1be6f0efcd1eade5feb4ee889fbdd431afb8f2989) |
| Campaña #2 `close_campaign` (reembolso 9 XLM) | [`4afa7d1b…e235a64320`](https://stellar.expert/explorer/testnet/tx/4afa7d1b4589427258876e8637694b5fd13db119544925160b58e42235a64320) |
| Campaña #3 `create_campaign` (reservada para el video) | [`bccfc3de…bab8ff5d`](https://stellar.expert/explorer/testnet/tx/bccfc3de9813357713cd8f89ea3882707f867368bcfc5aa30d13be3bbab8ff5d) |
| Campaña #3 `fund_campaign` (100 XLM) | [`5bc19341…a083e55e`](https://stellar.expert/explorer/testnet/tx/5bc19341551ae7d91a12c974f83854abddbf2b8e3aa448fdc9c9da5da083e55e) |
| Campaña #4 `create_campaign` (re-verificación) | [`2fbb6005…ac4d473f`](https://stellar.expert/explorer/testnet/tx/2fbb6005a1bc903870205065729ff4403d1bf05c1b43ea7778f1339fac4d473f) |
| Campaña #4 `fund_campaign` (100 XLM) | [`687ad091…fb6202c9`](https://stellar.expert/explorer/testnet/tx/687ad091e85ed66443183c0f38344824e9916beabc9f289fdfb2f2431b6202c9) |
| **Pago desde la app: Ana 20 XLM** (campaña #4) | [`4159a9d7…1f16fb51`](https://stellar.expert/explorer/testnet/tx/4159a9d770e097ec19cb5c1c93390ba3f3b405143e5f4716a26a0c141f16fb51) |
| **Pago desde la app: Bruno 15 XLM** (campaña #4) | [`569efd19…dfda79029`](https://stellar.expert/explorer/testnet/tx/569efd191edfba493493c08c73b28b5ac9b5f068001c88fec010a3ddfda79029) |

Estado on-chain leído con `get_campaign` al cierre:

| Campaña | Financiado | Pagado | Reembolsado | Estado |
|---|---|---|---|---|
| #1 | 100 XLM | 35 XLM | 0 | abierta |
| #2 | 10 XLM | 1 XLM | 9 XLM | cerrada |
| #3 | 100 XLM | 0 | 0 | abierta, **sin usar** (para el video) |
| #4 | 100 XLM | 35 XLM | 0 | abierta |

La campaña #4 existe porque la derivación de `reward_id` cambió (ahora incluye el ID de campaña on-chain) después de los pagos de la #1; se repitió el flujo completo para verificar el código final.

## Pruebas completadas

### Contrato (`pnpm contract:test`) — 12/12 OK

- [x] `distribute_requires_admin_auth`: sin firma del admin, falla.
- [x] `non_admin_cannot_distribute`
- [x] `non_owner_cannot_withdraw`
- [x] `stranger_cannot_close_campaign`
- [x] `payout_demo_20_and_15`: 100 de presupuesto, CPM 2, pagos de 20 y 15, saldos correctos.
- [x] `insufficient_funds_blocks_payout`
- [x] `double_distribution_is_rejected`
- [x] `owner_recovers_only_uncommitted_funds`: reembolso solo de lo no comprometido.
- [x] `release_frees_reservation`
- [x] `reserved_payout_must_match_amount`
- [x] `funding_moves_tokens_into_custody`
- [x] `guards_on_init_budget_and_amounts`

### Lógica de recompensas (`pnpm test`, vitest) — 10/10 OK

Cálculo incremental `floor(delta * cpm / 1000)`, tope `max_reward`, bloqueo por saldo insuficiente (sin prorrateo) y totales estimado / reservado / pagado.

### Calidad

- [x] `pnpm lint` sin errores
- [x] `pnpm typecheck` sin errores
- [x] `pnpm build` OK (Next.js 16, 20 rutas)

### En Testnet, contra el contrato

- [x] Pagar dos veces el mismo `reward_id` falla con `Error(Contract, #9)` (`RewardAlreadyPaid`).
- [x] Pagar más que el saldo falla con `Error(Contract, #8)` (`InsufficientFunds`).
- [x] `close_campaign` reembolsa solo lo disponible y emite el evento `Closed`.

### En Testnet, a través de la app (`pnpm demo:flow`)

- [x] Endpoint admin sin sesión → HTTP 401.
- [x] Aprobar 10.000 vistas → 20 XLM; 7.500 vistas → 15 XLM.
- [x] Re-aprobar las mismas vistas → HTTP 422 "No hay vistas nuevas verificadas".
- [x] Pago confirmado on-chain (`SUCCESS`) antes de marcar como pagado; re-pagar → "Ya estaba pagada", sin nueva tx.
- [x] Tras reiniciar el modo memoria (se pierde el registro off-chain), volver a pagar las mismas vistas → HTTP 409; el contrato lo impide y el saldo pagado sigue en 35 XLM.
- [x] Presupuesto insuficiente → HTTP 422 "Requiere 20, disponible 15" (aprobación bloqueada, sin prorrateo).
- [x] Tope por creador: 100.000 vistas (estimado 200 XLM) se reservan como 50 XLM.
- [x] "Liberar" cancela una reserva y devuelve el saldo disponible.
- [x] URL de contenido inválida → HTTP 400.
- [x] Todas las páginas (`/`, `/campaigns`, `/campaigns/[id]`, `/campaigns/new`, `/dashboard`, `/admin`) responden 200.

## Pendiente / no verificado

- [ ] **Supabase contra una base real**: el repositorio, la migración y las funciones RPC están escritos, pero no se ejecutaron (sin credenciales, Docker ni `psql` en el entorno de desarrollo). Primer paso al configurarlo: aplicar la migración y el seed y correr `pnpm demo:flow` con una campaña on-chain nueva.
- [ ] **Deploy en Vercel**: no realizado (requiere la cuenta del equipo). No hay URL pública todavía.
- [ ] Reserva on-chain al aprobar (`reserve_reward`): soportada y testeada en el contrato, no conectada a la app.
- [ ] Wallet del navegador (Freighter) para marcas y creadores.
- [ ] Verificación automática de vistas (fuera del alcance del MVP por diseño).
- [ ] Tests automatizados de los route handlers (cubiertos hoy por `scripts/07-demo-app-flow.mjs` contra Testnet).
- [ ] Video de demo grabado (guion en `DEMO_SCRIPT.md`).

# Wavo — Pitch deck

---

## 1. Problema

**Las marcas pagan por promesas; los creadores cobran tarde.**

- Las marcas pagan a creadores por adelantado o por "paquetes" sin saber si el contenido rinde.
- Los microcreadores de LATAM no tienen poder de negociación: esperan semanas, cobran en otra moneda y pierden parte en comisiones y conversiones.
- No hay forma simple de demostrar que el presupuesto existe ni de auditar cuánto se pagó a quién.

---

## 2. Solución

**Content Rewards: la marca paga solo por resultados verificados, el creador cobra en segundos.**

- La marca fija presupuesto, CPM y tope por creador, y deposita los fondos en un contrato inteligente.
- Cualquier creador se une, publica y envía su link.
- Las vistas se verifican y la recompensa se calcula sola: `vistas nuevas × CPM / 1.000`.
- El pago sale del contrato directo a la wallet del creador.

---

## 3. Producto (MVP funcionando en Testnet)

- **Marketplace de campañas** con presupuesto, CPM y progreso en vivo.
- **Panel del creador**: unirse con su dirección Stellar, enviar contenido, ver estimado / reservado / pagado.
- **Panel admin**: verificar vistas, aprobar (valida contra el saldo del contrato y reserva), pagar y ver la transacción en el explorer.
- **Garantías**: nunca se paga dos veces la misma vista, nunca se aprueba sin presupuesto, nunca se marca como pagado sin confirmación de la red.

Demo: campaña de 100 XLM, CPM 2 → Ana (10.000 vistas) cobra 20 XLM y Bruno (7.500 vistas) cobra 15 XLM, ambos con transacciones reales en Testnet (ver `CHECKLIST.md`).

---

## 4. Modelo de negocio

- **Fee de plataforma** sobre el presupuesto de cada campaña financiada (la marca lo paga al depositar).
- **Planes para marcas y agencias**: verificación prioritaria, reportes y gestión de múltiples campañas.
- **Verificación como servicio**: a futuro, integraciones con analíticas de plataformas para verificar vistas de forma automática.

El creador no paga por unirse: el incentivo es cobrar rápido y sin intermediarios.

---

## 5. Integración Stellar

- **Contrato Soroban `wavo_rewards`** (Rust): custodia por campaña, pagos idempotentes por `reward_id`, reembolso solo de fondos no comprometidos, eventos y TTL.
- **Stellar Asset Contract**: pagos en XLM nativo; el creador no necesita trustline. El contrato se inicializa con cualquier SAC, así que un despliegue con USDC u otro activo Stellar no requiere cambios de código.
- **Por qué Stellar**: comisiones de fracciones de centavo y confirmación en segundos hacen viables micro-pagos por rendimiento; red pensada para pagos y anclas en LATAM para pasar de cripto a moneda local.
- **Transparencia**: cada campaña y cada pago son verificables públicamente en el explorer.

---

## 6. Visión LATAM

- Empezar con marcas locales (consumo, gastronomía, turismo) que ya trabajan con microcreadores.
- Pagos en stablecoins y retiro a moneda local mediante anclas Stellar.
- Verificación automática de vistas e integración con wallets (Freighter, wallets móviles) para marcas y creadores.
- Meta: que cualquier creador de la región pueda cobrar por su alcance real, en minutos, sin importar dónde esté la marca.

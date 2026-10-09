# Wavo — Guion de demo (2–3 minutos)

**Preparación (antes de grabar, fuera de cámara)**

- `.env.local` generado (`pnpm testnet:env`) con `DEMO_ONCHAIN_CAMPAIGN_ID` apuntando a una campaña on-chain **sin pagos previos** (la #3 está financiada con 100 XLM y sin pagos al momento de escribir esto). Si ya se usó, crear otra: `pnpm testnet:campaign 4` y `DEMO_ONCHAIN_CAMPAIGN_ID=4`.
- `pnpm dev` recién iniciado (el modo memoria parte del seed).
- Pestañas abiertas: `http://localhost:3000`, `/admin` (sesión ya iniciada) y el contrato en [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAI46OBJ2WKRIGWQRYENLXEWITNQJ7CIAWTBI4BWD7RU7FQFTPXKGKF4).
- Si se usa Supabase, el banner de modo demo no aparece; si no, **dejarlo visible y mencionarlo**.

---

### 0:00 – 0:20 · Problema (landing)

> "Las marcas en LATAM pagan a creadores por adelantado, sin saber si el contenido rinde, y los creadores esperan semanas para cobrar, a menudo con comisiones de transferencias internacionales. Wavo cambia eso: las marcas pagan solo por vistas verificadas, y el creador cobra en segundos sobre Stellar."

Mostrar la landing: propuesta de valor y "cómo funciona".

### 0:20 – 0:50 · La campaña (marca)

Ir a **/campaigns** y abrir *Lanzamiento Café Andino*.

> "La marca deposita 100 XLM en un contrato Soroban. CPM de 2 XLM: cada 1.000 vistas verificadas pagan 2 XLM, con un tope de 50 por creador. El panel de custodia lee el contrato en vivo: el presupuesto está bloqueado on-chain, no en una promesa."

Señalar presupuesto, CPM, tope, la barra de presupuesto y el panel **Custodia on-chain** (pagado / disponible on-chain). Abrir el link del contrato en stellar.expert.

### 0:50 – 1:15 · El creador

En la misma página, sección del creador:

> "Ana y Bruno ya se unieron con su dirección Stellar y enviaron sus videos. No hace falta trustline: cobran en XLM nativo."

(Opcional, si sobra tiempo: **Unirme a la campaña** con un nuevo nombre/dirección y **Enviar para revisión** con un link.)

### 1:15 – 2:10 · Verificación y pago (admin)

Ir a **/admin**.

> "Un revisor verifica las vistas manualmente: en este MVP no hay oracle de redes sociales, y lo decimos explícitamente."

1. Envío de Ana: 10.000 vistas → **Aprobar**.
   > "La recompensa es floor(10.000 × 2 / 1.000) = 20 XLM. Antes de aprobar, Wavo lee el saldo disponible en el contrato; si no alcanza, la aprobación se bloquea. Nunca prorrateamos."
2. **Pagar on-chain**.
   > "El servidor firma `distribute_reward`, la envía y espera la confirmación. Solo cuando la red responde SUCCESS se marca como pagada."
3. Repetir con Bruno: 7.500 vistas → 15 XLM.
4. Pulsar **Aprobar** otra vez sobre Ana: el sistema lo rechaza porque no hay vistas nuevas desde el último pago.
   > "Doble clic, reintento, caída del servidor: da igual. Solo se pagan vistas nuevas, cada pago tiene un reward_id único y el contrato rechaza pagarlo dos veces."

Señalar que la fila pagada ya no tiene botón de pago, solo **Ver en Stellar Expert**.

### 2:10 – 2:35 · Prueba on-chain

Pulsar **Ver en Stellar Expert** en la distribución de Ana.

> "Esta es la transacción real en Testnet: evento Payout, 20 XLM del contrato a la wallet de Ana."

Volver a la campaña: presupuesto pagado 35 XLM, disponible 65. Abrir **/dashboard** para ver lo cobrado por creador.

### 2:35 – 2:50 · Cierre

> "Wavo: las marcas pagan resultados, los creadores cobran en segundos, y todo es verificable en Stellar. Próximo paso: verificación automática de vistas y wallets como Freighter para marcas y creadores."

---

**Reglas para la grabación**

- No mostrar `.env.local`, la terminal con claves ni la contraseña admin.
- No editar hashes ni montos en pantalla; si un pago queda "pendiente", decirlo y refrescar.
- Si la red falla, mostrar el error tal cual y usar los hashes reales ya registrados en `CHECKLIST.md`, aclarando que son de una ejecución previa.

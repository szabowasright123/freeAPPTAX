import { aDecimalDominio, fechaTextoAISO, utcTextoAHoraLocal } from './formatos'
import { parsearCSV } from './csv-generico'
import { type TipoOperacion } from '../../engine/types'
import {
  type ClaseExportacion,
  type LecturaExplorador,
  type MovimientoExplorador,
  type SentidoMovimiento,
} from './explorador'

export type PlantillaExchange = 'auto' | 'binance' | 'coinbase' | 'kraken' | 'generic' | 'cointracking'

type PlantillaConfig = {
  fecha: string[]
  hora: string[]
  tipo: string[]
  activo: string[]
  cantidad: string[]
  precio: string[]
  total: string[]
  fee: string[]
  feeMoneda: string[]
  tx: string[]
  desde: string[]
  hacia: string[]
}

const ALIAS_BINANCE: PlantillaConfig = {
  fecha: ['date', 'time', 'utc time', 'executetime'],
  hora: [],
  tipo: ['side', 'type', 'order type'],
  activo: ['market', 'pair', 'symbol', 'market pair'],
  cantidad: ['amount', 'filled', 'quantity', 'base', 'size'],
  precio: ['price', 'average price', 'avg price', 'rate'],
  total: ['total', 'quote amount', 'cost', 'total(quote)', 'value'],
  fee: ['fee', 'transaction fee', 'trading fee'],
  feeMoneda: ['fee coin', 'fee asset', 'asset', 'currency'],
  tx: ['order id', 'trade id', 'client order id', 'id'],
  desde: ['from', 'wallet', 'source'],
  hacia: ['to', 'wallet', 'destination'],
}

const ALIAS_COINBASE: PlantillaConfig = {
  fecha: ['timestamp', 'time', 'created at', 'transaction date'],
  hora: [],
  tipo: ['type', 'side', 'transaction type'],
  activo: ['asset', 'currency', 'coin', 'symbol'],
  cantidad: ['amount', 'quantity', 'size', 'balance'],
  precio: ['price', 'unit price'],
  total: ['total', 'amount', 'value', 'total balance'],
  fee: ['fee', 'fees', 'transaction fee', 'amount in fee'],
  feeMoneda: ['fee currency', 'fee asset', 'currency'],
  tx: ['trade id', 'transaction id', 'id'],
  desde: ['from', 'wallet', 'source'],
  hacia: ['to', 'wallet', 'destination'],
}

const ALIAS_KRAKEN: PlantillaConfig = {
  fecha: ['time', 'timestamp', 'tx timestamp', 'order executed at', 'created at'],
  hora: [],
  tipo: ['type', 'trade type', 'side', 'tx type', 'ordertype'],
  activo: ['asset', 'symbol', 'pair', 'base', 'quote', 'coin', 'market'],
  cantidad: ['amount', 'quantity', 'vol', 'volume', 'size', 'volumebase'],
  precio: ['price', 'rate', 'avgprice', 'average price', 'tradeprice', 'cost price'],
  total: ['total', 'cost', 'amount', 'cost', 'value', 'proceeds'],
  fee: ['fee', 'fee amount', 'fees', 'trade fee', 'commission'],
  feeMoneda: ['fee currency', 'feeasset', 'fee coin', 'currency'],
  tx: ['txid', 'trade id', 'order id', 'refid', 'id'],
  desde: ['from', 'wallet', 'trading wallet', 'walletfrom', 'source'],
  hacia: ['to', 'wallet', 'trading wallet', 'walletto', 'destination'],
}

const ALIAS_GENERIC: PlantillaConfig = {
  fecha: ['time', 'date', 'datetime', 'timestamp', 'createdat', 'trade time'],
  hora: ['hour', 'time_utc', 'time utc'],
  tipo: ['type', 'tipo', 'side', 'operation', 'operationtype', 'tradetype', 'order side'],
  activo: ['asset', 'coin', 'currency', 'symbol', 'pair', 'pairname', 'market', 'instrument'],
  cantidad: ['amount', 'size', 'quantity', 'filled', 'base', 'vol', 'volume', 'monto', 'qty'],
  precio: ['price', 'rate', 'avgprice', 'averageprice', 'executionprice'],
  total: ['total', 'totalcost', 'totalprice', 'cost', 'value', 'proceeds'],
  fee: ['fee', 'commission', 'feeamount', 'fees', 'takerfee', 'makerfee'],
  feeMoneda: ['feecurrency', 'feeunit', 'feecoin', 'commissioncurrency', 'feecurrency'],
  tx: ['txid', 'txhash', 'hash', 'tradeid', 'orderid', 'refid', 'id'],
  desde: ['from', 'fromaccount', 'fromaccountname', 'sender', 'walletfrom', 'sourceaddress'],
  hacia: ['to', 'toaccount', 'toaccountname', 'receiver', 'walletto', 'destinationaddress'],
}

const ALIAS_COINTRACKING = {
  fecha: ['date', 'time'],
  tipo: ['type'],
  buyCantidad: ['buy amount', 'amount buy', 'buynominal', 'buy'],
  buyActivo: ['buy currency', 'buycoin', 'buy currency symbol', 'buy coin'],
  sellCantidad: ['sell amount', 'amount sell', 'sellnominal', 'sell'],
  sellActivo: ['sell currency', 'sellcoin', 'sell currency symbol', 'sell coin'],
  precio: ['exchange rate', 'price', 'rate', 'unit price'],
  total: ['total', 'proceeds', 'cost', 'sum', 'market value'],
  fee: ['fee', 'fees', 'trading fee'],
  feeMoneda: ['fee currency', 'commission currency', 'fee coin'],
  tx: ['trade id', 'refid', 'id', 'transaction id'],
  desde: ['wallet', 'exchange', 'from', 'source'],
  hacia: ['wallet to', 'to', 'destination', 'destination account'],
}

function normalizarColumna(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_\/\-]/g, '')
    .replace(/[()]/g, '')
}

function indexarCabecera(cabecera: readonly string[]): Map<string, number> {
  const m = new Map<string, number>()
  cabecera.forEach((h, i) => {
    const n = normalizarColumna(h)
    if (n !== '' && !m.has(n)) m.set(n, i)
  })
  return m
}

function posPorAlias(indice: Map<string, number>, alias: readonly string[]): number | undefined {
  for (const a of alias) {
    const p = indice.get(normalizarColumna(a))
    if (p !== undefined) return p
  }
  for (const a of alias) {
    const objetivo = normalizarColumna(a)
    for (const [col, p] of indice.entries()) {
      if (col.includes(objetivo)) return p
    }
  }
  return undefined
}

function detectarSeparador(primeraLinea: string): ',' | ';' {
  const comas = (primeraLinea.match(/,/g) ?? []).length
  const puntocoma = (primeraLinea.match(/;/g) ?? []).length
  return puntocoma > comas ? ';' : ','
}

function normalizarTexto(valor: unknown): string {
  return (valor ?? '').toString().trim()
}

function detectarPlantilla(indice: Map<string, number>): PlantillaExchange {
  const has = (aliases: readonly string[]) => aliases.some((a) => posPorAlias(indice, [a]) !== undefined)

  if (has(ALIAS_BINANCE.fecha) && has(ALIAS_BINANCE.tipo) && has(ALIAS_BINANCE.activo)) return 'binance'
  if (has(ALIAS_COINBASE.fecha) && has(ALIAS_COINBASE.tipo) && has(ALIAS_COINBASE.activo)) return 'coinbase'
  if (has(ALIAS_KRAKEN.fecha) && has(ALIAS_KRAKEN.tipo) && has(ALIAS_KRAKEN.activo)) return 'kraken'
  if (detectarCoinTracking(indice)) return 'cointracking'
  return 'generic'
}

function fechaImportada(
  fila: string[],
  pFecha: number | undefined,
  pHora: number | undefined,
): string | undefined {
  const f = normalizarTexto(fila[pFecha ?? -1])
  const h = normalizarTexto(fila[pHora ?? -1])
  if (!f) return undefined
  return h ? fechaTextoAISO(f, h) : fechaTextoAISO(f) || utcTextoAHoraLocal(f)
}

function sugerenciaDesdeTipo(tipo: string): TipoOperacion | undefined {
  const t = normalizarColumna(tipo)
  if (t.includes('deposit') || t.includes('receive') || t.includes('ingress') || t.includes('buy') || t.includes('earn') || t.includes('reward')) return 'COMPRA'
  if (t.includes('withdraw') || t.includes('send') || t.includes('sell') || t.includes('spend') || t.includes('payout')) return 'VENTA'
  if (t.includes('trade') || t.includes('swap') || t.includes('convert') || t.includes('exchange') || t.includes('swap')) return 'PERMUTA'
  if (t.includes('airdrop') || t.includes('gift') || t.includes('bonus')) return 'AIRDROP'
  if (t.includes('staking') || t.includes('interest') || t.includes('yield')) return 'RENDIMIENTO'
  return undefined
}

function sentidoDesdeTipo(tipo: string): SentidoMovimiento {
  const t = normalizarColumna(tipo)
  if (t.includes('deposit') || t.includes('receive') || t.includes('ingress') || t.includes('buy') || t.includes('reward')) return 'entrada'
  if (t.includes('withdraw') || t.includes('send') || t.includes('sell') || t.includes('spend') || t.includes('payout')) return 'salida'
  if (t.includes('transfer') || t.includes('reimburse') || t.includes('refund')) return 'ninguno'
  return 'ninguno'
}

function normalizarCantidad(texto: string): string {
  const n = aDecimalDominio(texto)
  if (n && n !== '0') return n
  const sinSigno = texto.trim().replace(/^[+-]/, '')
  const v = aDecimalDominio(sinSigno)
  if (v && v !== '0') return v
  const combo = /^(-?\d+(?:[.,]\d+)?)\s+[A-Za-z]{2,10}$/u.exec(texto.trim())
  if (!combo) return '0'
  return aDecimalDominio(combo[1]) ?? '0'
}

function normalizarActivo(valor: string): { activo: string; esPar: boolean } {
  const limpio = valor.replace(/["']/g, '').trim()
  if (limpio === '') return { activo: 'TOKEN', esPar: false }

  const partes = limpio
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)

  if (partes.length === 2) {
    return { activo: partes[0]!.toUpperCase(), esPar: true }
  }

  return { activo: limpio.toUpperCase(), esPar: false }
}

function elegirPosicion(idx: Map<string, number>, cfg: PlantillaConfig, clave: keyof PlantillaConfig): number | undefined {
  return posPorAlias(idx, cfg[clave])
}

function detectarCoinTracking(indice: Map<string, number>): boolean {
  const tiene = (aliases: readonly string[]) => aliases.some((a) => posPorAlias(indice, [a]) !== undefined)
  return (
    tiene(ALIAS_COINTRACKING.fecha) &&
    tiene(ALIAS_COINTRACKING.tipo) &&
    (tiene(ALIAS_COINTRACKING.buyCantidad) || tiene(ALIAS_COINTRACKING.sellCantidad))
  )
}

/** Lee un CSV de exchange y lo transforma para la bandeja de triaje. */
export function leerCsvExchange(
  texto: string,
  nombreFichero = 'CSV',
  plantillaForzada: PlantillaExchange = 'auto',
): LecturaExplorador {
  const filas = parsearCSV(texto, detectarSeparador(texto.split(/\r?\n/, 1)[0] ?? ''))
  if (filas.length === 0) throw new Error(`«${nombreFichero}» está vacío.`)

  const cabecera = filas[0] ?? []
  const indice = indexarCabecera(cabecera)

  const detectada = detectarPlantilla(indice)
  const plantilla =
    plantillaForzada === 'auto'
      ? detectada
      : plantillaForzada === 'cointracking'
        ? 'cointracking'
        : plantillaForzada

  const esCoinTracking = plantilla === 'cointracking'
  const cfg =
    plantilla === 'binance'
      ? ALIAS_BINANCE
      : plantilla === 'coinbase'
        ? ALIAS_COINBASE
        : plantilla === 'kraken'
          ? ALIAS_KRAKEN
          : ALIAS_GENERIC
  const cfgCoin = ALIAS_COINTRACKING

  const pFecha = elegirPosicion(indice, cfg, 'fecha')
  const pHora = elegirPosicion(indice, cfg, 'hora')
  const pTipo = elegirPosicion(indice, cfg, 'tipo')
  const pActivo = elegirPosicion(indice, cfg, 'activo')
  const pCantidad = elegirPosicion(indice, cfg, 'cantidad')
  const pPrecio = elegirPosicion(indice, cfg, 'precio')
  const pTotal = elegirPosicion(indice, cfg, 'total')
  const pFee = elegirPosicion(indice, cfg, 'fee')
  const pFeeMoneda = elegirPosicion(indice, cfg, 'feeMoneda')
  const pTx = esCoinTracking ? posPorAlias(indice, cfgCoin.tx) : elegirPosicion(indice, cfg, 'tx')
  const pDesde = esCoinTracking ? posPorAlias(indice, cfgCoin.desde) : elegirPosicion(indice, cfg, 'desde')
  const pHacia = esCoinTracking ? posPorAlias(indice, cfgCoin.hacia) : elegirPosicion(indice, cfg, 'hacia')

  const pBuyCantidad = esCoinTracking ? posPorAlias(indice, cfgCoin.buyCantidad) : undefined
  const pBuyActivo = esCoinTracking ? posPorAlias(indice, cfgCoin.buyActivo) : undefined
  const pSellCantidad = esCoinTracking ? posPorAlias(indice, cfgCoin.sellCantidad) : undefined
  const pSellActivo = esCoinTracking ? posPorAlias(indice, cfgCoin.sellActivo) : undefined
  const pPrecioCoin = esCoinTracking ? posPorAlias(indice, cfgCoin.precio) : undefined
  const pTotalCoin = esCoinTracking ? posPorAlias(indice, cfgCoin.total) : undefined
  const pFeeCoin = esCoinTracking ? posPorAlias(indice, cfgCoin.fee) : pFee
  const pFeeMonedaCoin = esCoinTracking ? posPorAlias(indice, cfgCoin.feeMoneda) : pFeeMoneda

  if (pFecha === undefined) throw new Error(`No reconozco «${nombreFichero}» como CSV de exchange: falta fecha.`)
  if (!esCoinTracking && pCantidad === undefined && pTotal === undefined) {
    throw new Error(`No reconozco «${nombreFichero}» como CSV de exchange: falta cantidad o total.`)
  }
  const campo = (fila: string[], pos: number | undefined): string =>
    pos === undefined ? '' : normalizarTexto(fila[pos])

  const movimientos: MovimientoExplorador[] = []
  const filasRechazadas: { linea: number; motivo: string }[] = []
  const avisos: string[] = [
    plantilla === 'auto'
      ? 'Plantilla detectada automáticamente'
      : plantilla === 'binance'
        ? 'Plantilla forzada: Binance'
        : plantilla === 'coinbase'
          ? 'Plantilla forzada: Coinbase'
          : plantilla === 'kraken'
            ? 'Plantilla forzada: Kraken'
            : plantilla === 'cointracking'
              ? 'Plantilla forzada: CoinTracking'
              : plantilla === 'generic'
                ? 'Plantilla forzada: genérica'
                : `Plantilla detectada: ${detectada}`,
  ]

  let detectoPar = false
  let traePrecioTotal = false

  for (let f = 1; f < filas.length; f++) {
    const fila = filas[f] ?? []
    const linea = f + 1

    const fechaHora = fechaImportada(fila, pFecha, pHora)
    if (!fechaHora) {
      filasRechazadas.push({ linea, motivo: 'fecha ilegible' })
      continue
    }

    const fechaBruta = campo(fila, pFecha)
    const tipo = campo(fila, pTipo)
    const tipoSugerido = sugerenciaDesdeTipo(tipo)
    const sentido = sentidoDesdeTipo(tipo)

    const cantidadCompra = esCoinTracking ? normalizarCantidad(campo(fila, pBuyCantidad)) : '0'
    const activoCompra = normalizarActivo(campo(fila, pBuyActivo)).activo
    const cantidadVenta = esCoinTracking ? normalizarCantidad(campo(fila, pSellCantidad)) : '0'
    const activoVenta = normalizarActivo(campo(fila, pSellActivo)).activo
    const usarCompra = esCoinTracking && (cantidadCompra !== '0' && activoCompra !== 'TOKEN')
    const usarVenta = esCoinTracking && (cantidadVenta !== '0' && activoVenta !== 'TOKEN')

    const { activo, esPar } = esCoinTracking
      ? normalizarActivo(usarCompra ? activoCompra : activoVenta)
      : normalizarActivo(campo(fila, pActivo))
    const cantidad = esCoinTracking
      ? usarCompra
        ? cantidadCompra
        : cantidadVenta
      : normalizarCantidad(campo(fila, pCantidad) || campo(fila, pTotal))
    if (esPar) detectoPar = true

    const precio = esCoinTracking ? aDecimalDominio(campo(fila, pPrecioCoin)) : aDecimalDominio(campo(fila, pPrecio))
    const total = esCoinTracking ? aDecimalDominio(campo(fila, pTotalCoin)) : aDecimalDominio(campo(fila, pTotal))
    if (precio || total) traePrecioTotal = true

    const fee = aDecimalDominio(campo(fila, pFeeCoin))
    const feeMoneda = campo(fila, pFeeMonedaCoin) || activo
    const txhash = campo(fila, pTx) || `exchange-${linea}`

    const tipoSugeridoAjustado = esCoinTracking && (usarCompra || usarVenta)
      ? usarCompra
        ? 'COMPRA'
        : usarVenta
          ? 'VENTA'
          : tipoSugerido
      : tipoSugerido
    const sentidoAjustado = sentidoDesdeTipo(tipoSugeridoAjustado ?? tipo)

    if ((cantidad === '0' || cantidad === '') && (!fee || fee === '0')) {
      filasRechazadas.push({ linea, motivo: 'sin cantidad ni comisión' })
      continue
    }

    movimientos.push({
      clave: `${txhash}#exchange#${f - 1}`,
      txhash,
      clase: 'exchange' as ClaseExportacion,
      indice: f - 1,
      fechaHora,
      fechaHoraUtc: fechaBruta,
      desde: campo(fila, pDesde),
      hacia: campo(fila, pHacia),
      sentido: esCoinTracking ? (usarCompra ? 'entrada' : usarVenta ? 'salida' : sentidoAjustado) : sentido,
      activo,
      cantidad: esCoinTracking ? cantidad : cantidad,
      comisionCantidad: fee && fee !== '0' ? fee : undefined,
      comisionActivo: fee && fee !== '0' ? feeMoneda : undefined,
      contrato: undefined,
      sugerenciaTipo:
        tipoSugeridoAjustado === 'COMPRA'
          ? 'COMPRA'
          : tipoSugeridoAjustado === 'VENTA'
            ? 'VENTA'
            : tipoSugerido,
      fallida: false,
      linea,
    })
  }

  if (detectoPar) {
    avisos.push('Tu CSV trae pares (por ejemplo BTC/USDT): se usa el primer activo del par.')
  }
  if (traePrecioTotal) {
    avisos.push('Incluye precio/importe total: revisa el contravalor en € en la bandeja.')
  }

  if (movimientos.length === 0) {
    throw new Error(`No se pudo importar ninguna fila útil desde «${nombreFichero}».`)
  }

  return {
    clase: 'exchange',
    activoNativo: '',
    movimientos,
    avisos,
    filasRechazadas,
  }
}


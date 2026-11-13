import { formatCost, type CostBreakdown } from '../utils/pricing'

/** Desglose de costo: filamento, máquina, accesorios y total. */
export default function CostLines({ cost }: { cost: CostBreakdown }) {
  return (
    <dl className="cost-lines">
      <div><dt>Filamento</dt><dd>{formatCost(cost.filament)}</dd></div>
      <div><dt>Máquina</dt><dd>{formatCost(cost.machine)}</dd></div>
      <div><dt>Accesorios</dt><dd>{formatCost(cost.accessories)}</dd></div>
      <div className="cost-total"><dt>Costo por pieza</dt><dd>{formatCost(cost.total)}</dd></div>
    </dl>
  )
}

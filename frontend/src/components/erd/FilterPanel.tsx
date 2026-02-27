import type { ConfidenceLevel } from '../../types/erd'
import { DOMAIN_COLORS } from '../../mock/erdMockData'

const CONFIDENCES: ConfidenceLevel[] = ['FK', 'HIGH', 'MEDIUM', 'LOW']

interface Props {
  domains: string[]
  searchTerm: string
  onSearchChange: (v: string) => void
  enabledDomains: Set<string>
  onDomainsChange: (v: Set<string>) => void
  enabledConfidences: Set<ConfidenceLevel>
  onConfidencesChange: (v: Set<ConfidenceLevel>) => void
}

export function FilterPanel({
  domains,
  searchTerm,
  onSearchChange,
  enabledDomains,
  onDomainsChange,
  enabledConfidences,
  onConfidencesChange,
}: Props) {
  const toggleDomain = (domain: string) => {
    const next = new Set(enabledDomains)
    if (next.has(domain)) next.delete(domain)
    else next.add(domain)
    onDomainsChange(next)
  }

  const toggleConfidence = (c: ConfidenceLevel) => {
    const next = new Set(enabledConfidences)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    onConfidencesChange(next)
  }

  const allDomainsOn = domains.every(d => enabledDomains.has(d))
  const toggleAllDomains = () => {
    if (allDomainsOn) onDomainsChange(new Set())
    else onDomainsChange(new Set(domains))
  }

  return (
    <aside className="filter-panel">
      <div className="filter-panel__section">
        <label className="filter-panel__label">검색</label>
        <input
          className="filter-panel__search"
          type="text"
          placeholder="테이블명 / 코멘트"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-panel__section">
        <div className="filter-panel__label-row">
          <label className="filter-panel__label">도메인</label>
          <button className="filter-panel__toggle-all" onClick={toggleAllDomains}>
            {allDomainsOn ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        {domains.map(d => (
          <label key={d} className="filter-panel__check-row">
            <input
              type="checkbox"
              checked={enabledDomains.has(d)}
              onChange={() => toggleDomain(d)}
            />
            <span
              className="filter-panel__domain-badge"
              style={{ background: DOMAIN_COLORS[d] ?? DOMAIN_COLORS['ETC'] }}
            >
              {d}
            </span>
          </label>
        ))}
      </div>

      <div className="filter-panel__section">
        <label className="filter-panel__label">관계 신뢰도</label>
        {CONFIDENCES.map(c => (
          <label key={c} className="filter-panel__check-row">
            <input
              type="checkbox"
              checked={enabledConfidences.has(c)}
              onChange={() => toggleConfidence(c)}
            />
            <span className={`filter-panel__conf-badge conf-badge--${c.toLowerCase()}`}>
              {c}
            </span>
          </label>
        ))}
      </div>
    </aside>
  )
}

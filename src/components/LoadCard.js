import React from 'react';
import { getStatus } from '../data/models';

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return d; }
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

const LoadCard = ({ load, drivers = [], onClick }) => {
  const status = getStatus(load.status);
  const driver = drivers.find((d) => d.id === load.assignedDriverId);
  const pickupCity = [load.pickup?.city, load.pickup?.state].filter(Boolean).join(', ');
  const deliveryCity = [load.delivery?.city, load.delivery?.state].filter(Boolean).join(', ');
  const date = load.pickup?.date || load.createdAt?.slice(0, 10);
  const hasCharges = (load.charges || []).length > 0;
  const chargesTotal = (load.charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalAmount = Number(load.rate?.amount || 0) + chargesTotal;

  return (
    <button
      onClick={() => onClick && onClick(load)}
      style={{
        display: 'block',
        width: '100%',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '14px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        marginBottom: '10px',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Top row: load number + status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0' }}>
          {load.loadNumber}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px',
          background: status.bg, color: status.color, whiteSpace: 'nowrap',
        }}>
          {status.label}
        </span>
      </div>

      {/* Broker ref */}
      {load.reference?.brokerLoadNumber && (
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
          Ref: {load.reference.brokerLoadNumber}
        </div>
      )}

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '8px' }}>
        <span style={{ color: '#4ade80' }}>🟢</span>
        <span style={{ color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pickupCity || '—'}
        </span>
        <span style={{ color: '#475569' }}>→</span>
        <span style={{ color: '#f87171' }}>🔴</span>
        <span style={{ color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {deliveryCity || '—'}
        </span>
      </div>

      {/* Bottom row: date, miles, driver, amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {date && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {formatDate(date)}
            </span>
          )}
          {load.rate?.miles > 0 && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {load.rate.miles} mi
            </span>
          )}
          {driver && (
            <span style={{ fontSize: '12px', color: '#7dd3fc', background: '#0c2a4a', borderRadius: '4px', padding: '1px 6px' }}>
              {driver.name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>
            {formatMoney(totalAmount)}
          </span>
          <span style={{ color: '#475569', fontSize: '16px' }}>›</span>
        </div>
      </div>

      {/* Needs action indicator */}
      {(load.status === 'rate_con_upload') && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#fb923c', fontWeight: '600' }}>
          ⚠️ Needs rate con upload
        </div>
      )}
      {load.status === 'delivered' && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#4ade80', fontWeight: '600' }}>
          ✓ Ready to invoice
        </div>
      )}
    </button>
  );
};

export default LoadCard;

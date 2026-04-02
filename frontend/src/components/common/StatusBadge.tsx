import React from 'react';
import { GlassBadge } from '../glass';

export type AgentStatus = 'active' | 'idle' | 'error' | 'pending';

interface StatusBadgeProps {
  status: AgentStatus;
  pulse?: boolean;
}

const statusConfig = {
  active: {
    variant: 'active' as const,
    label: 'Running',
    icon: '●',
  },
  idle: {
    variant: 'idle' as const,
    label: 'Idle',
    icon: '○',
  },
  error: {
    variant: 'warning' as const,
    label: 'Error',
    icon: '⚠',
  },
  pending: {
    variant: 'pending' as const,
    label: 'Pending',
    icon: '◐',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  pulse = status === 'active',
}) => {
  const config = statusConfig[status];

  return (
    <GlassBadge
      variant={config.variant}
      pulse={pulse}
      icon={<span className="text-xs">{config.icon}</span>}
    >
      {config.label}
    </GlassBadge>
  );
};

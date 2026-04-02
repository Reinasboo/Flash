import React from 'react';
import { GlassCard, GlassButton } from '../glass';
import { StatusBadge, AgentStatus } from '../common/StatusBadge';

interface Agent {
  id: string;
  name: string;
  type: 'Accumulator' | 'Distributor' | 'Custom';
  status: AgentStatus;
  balance: number;
  lastAction: string;
  nextRun: string;
}

interface AgentCardProps {
  agent: Agent;
  onViewDetails?: (agentId: string) => void;
  onControl?: (agentId: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onViewDetails,
  onControl,
}) => {
  return (
    <GlassCard className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-constellation-cyan/20">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-constellation-white mb-1">
            {agent.name}
          </h3>
          <p className="text-sm text-constellation-cyan opacity-75">
            {agent.type}
          </p>
        </div>
        <StatusBadge status={agent.status} pulse={agent.status === 'active'} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
        <div>
          <p className="text-xs text-constellation-slate opacity-75 mb-1">
            Balance
          </p>
          <p className="text-lg font-bold text-constellation-white">
            {agent.balance.toFixed(2)}
          </p>
          <p className="text-xs text-constellation-cyan">XLM</p>
        </div>
        <div>
          <p className="text-xs text-constellation-slate opacity-75 mb-1">
            Status
          </p>
          <p className="text-sm font-semibold text-constellation-cyan">
            {agent.status === 'active' ? 'Running' : 'Stopped'}
          </p>
        </div>
        <div>
          <p className="text-xs text-constellation-slate opacity-75 mb-1">
            Last Action
          </p>
          <p className="text-xs text-constellation-white">{agent.lastAction}</p>
        </div>
        <div>
          <p className="text-xs text-constellation-slate opacity-75 mb-1">
            Next Run
          </p>
          <p className="text-xs text-constellation-white">{agent.nextRun}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-constellation-cyan/15">
        <GlassButton
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => onViewDetails?.(agent.id)}
        >
          View Details
        </GlassButton>
        <GlassButton
          size="sm"
          variant="primary"
          className="flex-1"
          onClick={() => onControl?.(agent.id)}
        >
          Control
        </GlassButton>
      </div>
    </GlassCard>
  );
};

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  XCircle,
  X,
  Bell,
  Trash2,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { ToastType, ToastNotification } from '../../types';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, clearAllToasts } = useHospital();

  if (toasts.length === 0) return null;

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case 'emergency':
        return {
          icon: AlertOctagon,
          borderColor: 'border-rose-500/80',
          bgColor: 'bg-rose-950/90',
          textColor: 'text-rose-100',
          titleColor: 'text-rose-200',
          iconColor: 'text-rose-400',
          badgeBg: 'bg-rose-500 text-white',
          badgeLabel: 'EMERGENCY',
          progressBarColor: 'bg-rose-500',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          borderColor: 'border-amber-500/60',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-amber-200',
          titleColor: 'text-amber-300',
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          badgeLabel: 'ALERT',
          progressBarColor: 'bg-amber-400',
        };
      case 'error':
        return {
          icon: XCircle,
          borderColor: 'border-red-500/70',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-red-200',
          titleColor: 'text-red-300',
          iconColor: 'text-red-400',
          badgeBg: 'bg-red-500/20 text-red-300 border border-red-500/30',
          badgeLabel: 'ERROR',
          progressBarColor: 'bg-red-400',
        };
      case 'info':
        return {
          icon: Info,
          borderColor: 'border-cyan-500/60',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-slate-300',
          titleColor: 'text-cyan-300',
          iconColor: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          badgeLabel: 'NOTICE',
          progressBarColor: 'bg-cyan-400',
        };
      case 'success':
      default:
        return {
          icon: CheckCircle2,
          borderColor: 'border-emerald-500/60',
          bgColor: 'bg-slate-900/95',
          textColor: 'text-slate-300',
          titleColor: 'text-emerald-300',
          iconColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          badgeLabel: 'SUCCESS',
          progressBarColor: 'bg-emerald-400',
        };
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.length > 1 && (
        <div className="flex justify-end pointer-events-auto mb-1">
          <button
            onClick={clearAllToasts}
            className="flex items-center space-x-1.5 text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 shadow-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear All ({toasts.length})</span>
          </button>
        </div>
      )}

      {toasts.map(toast => {
        const config = getToastConfig(toast.type);
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300 ${config.borderColor} ${config.bgColor}`}
          >
            <div className="p-3.5 flex items-start space-x-3">
              {/* Icon Container */}
              <div
                className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                  toast.type === 'emergency'
                    ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              {/* Toast Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.badgeBg}`}
                  >
                    {config.badgeLabel}
                  </span>
                  <span className="text-[11px] text-slate-400">{toast.timestamp}</span>
                </div>
                <h4 className={`text-sm font-semibold leading-snug ${config.titleColor}`}>
                  {toast.title}
                </h4>
                <p className={`text-xs mt-0.5 leading-relaxed break-words ${config.textColor}`}>
                  {toast.message}
                </p>

                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={() => {
                      toast.onAction?.();
                      removeToast(toast.id);
                    }}
                    className="mt-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center space-x-1"
                  >
                    <span>{toast.actionLabel}</span>
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle Progress Bar */}
            {toast.duration && toast.duration > 0 && (
              <div className="h-0.5 w-full bg-slate-800/80 overflow-hidden">
                <div
                  className={`h-full ${config.progressBarColor} animate-[shrink_linear_forwards]`}
                  style={{
                    animationDuration: `${toast.duration}ms`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

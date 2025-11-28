/**
 * StaffPINLogin Component
 * 
 * A dedicated PIN entry component for staff station access.
 * Supports 4-6 digit PINs with visual feedback.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffPINLoginProps {
  onSuccess: () => void;
  onCancel?: () => void;
  eventName?: string;
  expectedPIN?: string;
  maxAttempts?: number;
  pinLength?: number;
}

export function StaffPINLogin({
  onSuccess,
  onCancel,
  eventName = 'Event',
  expectedPIN,
  maxAttempts = 3,
  pinLength = 4
}: StaffPINLoginProps) {
  const [pin, setPin] = useState<string[]>(Array(pinLength).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === pinLength - 1 && newPin.every(d => d !== '')) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === pinLength) {
        handleSubmit(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, pinLength);
    if (pastedData.length === pinLength) {
      const newPin = pastedData.split('');
      setPin(newPin);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (pinValue: string) => {
    if (isLocked || isVerifying) return;
    
    setIsVerifying(true);
    
    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (expectedPIN && pinValue === expectedPIN) {
      setIsVerifying(false);
      onSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setIsVerifying(false);
      
      if (newAttempts >= maxAttempts) {
        setIsLocked(true);
        setError(`Too many attempts. Access locked.`);
      } else {
        setError(`Invalid PIN. ${maxAttempts - newAttempts} attempt(s) remaining.`);
        setPin(Array(pinLength).fill(''));
        inputRefs.current[0]?.focus();
      }
    }
  };

  const handleClear = () => {
    setPin(Array(pinLength).fill(''));
    setError(null);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Staff Access</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Enter the {pinLength}-digit PIN to access <span className="text-indigo-400">{eventName}</span>
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* PIN Input Grid */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLocked || isVerifying}
                className={cn(
                  "w-14 h-16 text-center text-2xl font-bold",
                  "bg-slate-700/50 border-slate-600 text-white",
                  "focus:border-indigo-500 focus:ring-indigo-500/20",
                  "transition-all duration-200",
                  digit && "border-indigo-500/50 bg-indigo-500/10",
                  error && "border-red-500/50 shake",
                  isLocked && "opacity-50 cursor-not-allowed"
                )}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Verifying State */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-indigo-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={isVerifying}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleClear}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={isLocked || isVerifying}
            >
              Clear
            </Button>
          </div>

          {/* Locked State */}
          {isLocked && (
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                Contact an administrator to unlock access.
              </p>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
            <Lock className="w-3 h-3" />
            <span>Secure staff authentication</span>
          </div>
        </CardContent>
      </Card>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default StaffPINLogin;


'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEMSStore } from '@/lib/store';
import { playDingSound, playErrorSound } from '@/lib/audio';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Lock, Clock, CheckCircle2, UserCog, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ClockMethod = 'face' | 'pin' | 'manual';
type FaceState = 'idle' | 'camera-on' | 'liveness' | 'processing' | 'success' | 'failure';

export function ClockInModal() {
  const {
    clockInModalOpen, setClockInModalOpen,
    clockInWithFace, clockInWithPin, manualPunch,
    user, attendance, users,
  } = useEMSStore();

  const [method, setMethod] = useState<ClockMethod>('face');
  const [pin, setPin] = useState('');
  const [faceState, setFaceState] = useState<FaceState>('idle');
  const [livenessConfirmed, setLivenessConfirmed] = useState(false);
  const [livenessMessage, setLivenessMessage] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [manualPunchType, setManualPunchType] = useState<'clock-in' | 'clock-out'>('clock-in');
  const [manualTime, setManualTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ringColor, setRingColor] = useState<'emerald' | 'red' | 'default'>('default');

  // Refs for webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const livenessCheckRef = useRef<number | null>(null);
  const blinkDetectedRef = useRef(false);

  // Real-time clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const isClockedIn = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find((a) => a.date === today && a.userId === user?.id);
    return record?.clockIn && !record?.clockOut;
  }, [attendance, user?.id]);

  const punchTypeLabel = isClockedIn() ? 'Clock Out' : 'Clock In';

  // Cleanup webcam on unmount or close
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (livenessCheckRef.current) {
      cancelAnimationFrame(livenessCheckRef.current);
      livenessCheckRef.current = null;
    }
    prevFrameRef.current = null;
    blinkDetectedRef.current = false;
  }, []);

  useEffect(() => {
    if (!clockInModalOpen) {
      stopCamera();
      setFaceState('idle');
      setLivenessConfirmed(false);
      setLivenessMessage('');
      setRingColor('default');
    }
  }, [clockInModalOpen, stopCamera]);

  // Start webcam when Face ID method is selected
  useEffect(() => {
    if (method === 'face' && clockInModalOpen && faceState === 'idle') {
      startCamera();
    }
    if (method !== 'face') {
      stopCamera();
      setFaceState('idle');
      setLivenessConfirmed(false);
      setLivenessMessage('');
      setRingColor('default');
    }
  }, [method, clockInModalOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setFaceState('camera-on');
      // Start liveness check after a short delay
      setTimeout(() => {
        setFaceState('liveness');
        setLivenessMessage('Please blink slowly');
        startLivenessCheck();
      }, 1500);
    } catch {
      toast.error('Camera access denied. Please use PIN instead.');
      setMethod('pin');
    }
  };

  const startLivenessCheck = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 240;

    let frameCount = 0;
    const checkFrame = () => {
      if (!streamRef.current) return;

      ctx.drawImage(video, 0, 0, 320, 240);
      const currentFrame = ctx.getImageData(0, 0, 320, 240);

      if (prevFrameRef.current && frameCount > 5) {
        let diff = 0;
        const data = currentFrame.data;
        const prev = prevFrameRef.current.data;
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
          diff += Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]) + Math.abs(data[i + 2] - prev[i + 2]);
        }
        const avgDiff = diff / (data.length / 16);

        // Detect significant motion (blink) in the eye region (top third of image)
        let eyeRegionDiff = 0;
        const eyeStart = 0;
        const eyeEnd = Math.floor(240 * 0.4) * 320 * 4;
        for (let i = eyeStart; i < eyeEnd; i += 16) {
          eyeRegionDiff += Math.abs(data[i] - prev[i]);
        }
        const avgEyeDiff = eyeRegionDiff / ((eyeEnd - eyeStart) / 16);

        if ((avgDiff > 15 || avgEyeDiff > 20) && !blinkDetectedRef.current) {
          blinkDetectedRef.current = true;
          setLivenessConfirmed(true);
          setLivenessMessage('Liveness confirmed ✓');
          if (livenessCheckRef.current) {
            cancelAnimationFrame(livenessCheckRef.current);
            livenessCheckRef.current = null;
          }
          return;
        }
      }

      prevFrameRef.current = currentFrame;
      frameCount++;
      livenessCheckRef.current = requestAnimationFrame(checkFrame);
    };

    livenessCheckRef.current = requestAnimationFrame(checkFrame);
  };

  const captureFrame = (): string | null => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // base64 without prefix
  };

  const handleFaceClockIn = async () => {
    if (!livenessConfirmed) return;
    const imageBase64 = captureFrame();
    if (!imageBase64) {
      toast.error('Failed to capture image');
      return;
    }

    setFaceState('processing');
    setRingColor('default');

    try {
      await clockInWithFace(imageBase64);
      setFaceState('success');
      setRingColor('emerald');
      playDingSound();
      const time = format(new Date(), 'hh:mm:ss a');
      setSuccessMessage(`Welcome back, ${user?.name}. Clocked in at ${time}`);
      setSuccess(true);

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch {
      setFaceState('failure');
      setRingColor('red');
      playErrorSound();
      // Allow retry after 3 seconds
      setTimeout(() => {
        setFaceState('liveness');
        setRingColor('default');
        setLivenessConfirmed(false);
        setLivenessMessage('Please blink slowly');
        blinkDetectedRef.current = false;
        startLivenessCheck();
      }, 3000);
    }
  };

  const handlePinClockIn = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      await clockInWithPin(pin);
      playDingSound();
      setSuccessMessage(`${punchTypeLabel} successful!`);
      setSuccess(true);
      toast.success(`${punchTypeLabel} successful!`);
      setTimeout(() => handleClose(), 1500);
    } catch {
      playErrorSound();
      toast.error(`${punchTypeLabel} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPunch = async () => {
    if (!manualUserId || !manualTime) return;
    setLoading(true);
    try {
      await manualPunch(manualUserId, manualPunchType, manualTime);
      toast.success(`Manual punch recorded successfully`);
      setSuccessMessage('Manual punch recorded');
      setSuccess(true);
      setTimeout(() => handleClose(), 1500);
    } catch {
      toast.error('Manual punch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setClockInModalOpen(false);
    setPin('');
    setSuccess(false);
    setSuccessMessage('');
    setFaceState('idle');
    setLivenessConfirmed(false);
    setLivenessMessage('');
    setRingColor('default');
    setManualUserId('');
    setManualPunchType('clock-in');
    setManualTime('');
    setMethod('face');
    setLoading(false);
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((p) => p + digit);
    }
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  const pinPadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  const ringColorClasses = {
    emerald: 'border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]',
    red: 'border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.5)]',
    default: 'border-emerald-500/40',
  };

  return (
    <Dialog open={clockInModalOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-strong sm:max-w-md border-white/20">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">Clock In / Out</DialogTitle>
          {user && (
            <div className="text-center text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{user.name}</span>
              {user.department && (
                <span className="text-muted-foreground"> · {user.department}</span>
              )}
            </div>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              </motion.div>
              <p className="text-emerald-400 font-medium text-lg">{successMessage}</p>
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 py-2"
            >
              {/* Real-time clock display */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-3xl font-bold font-mono tracking-wider">{timeStr}</span>
                </div>
                <p className="text-sm text-muted-foreground">{dateStr}</p>
              </div>

              {/* Method tabs */}
              <div className="flex gap-2">
                <Button
                  variant={method === 'face' ? 'default' : 'outline'}
                  onClick={() => { setMethod('face'); }}
                  className={cn('flex-1 gap-2', method === 'face' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-white/20')}
                >
                  <Camera className="h-4 w-4" />
                  Face ID
                </Button>
                <Button
                  variant={method === 'pin' ? 'default' : 'outline'}
                  onClick={() => { setMethod('pin'); }}
                  className={cn('flex-1 gap-2', method === 'pin' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-white/20')}
                >
                  <Lock className="h-4 w-4" />
                  PIN
                </Button>
                {isAdminOrManager && (
                  <Button
                    variant={method === 'manual' ? 'default' : 'outline'}
                    onClick={() => { setMethod('manual'); }}
                    className={cn('flex-1 gap-2', method === 'manual' ? 'bg-amber-600 hover:bg-amber-500' : 'border-white/20')}
                  >
                    <UserCog className="h-4 w-4" />
                    Manual
                  </Button>
                )}
              </div>

              {/* FACE ID FLOW */}
              {method === 'face' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Webcam + Overlay */}
                  <div className="relative w-56 h-56 rounded-full overflow-hidden">
                    {/* Targeting ring */}
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-full border-4 z-10 transition-colors duration-500',
                        ringColorClasses[ringColor]
                      )}
                      animate={ringColor === 'default' ? {
                        boxShadow: [
                          '0 0 15px rgba(16,185,129,0.3)',
                          '0 0 30px rgba(16,185,129,0.5)',
                          '0 0 15px rgba(16,185,129,0.3)',
                        ],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {/* Pulsing outer ring */}
                    <motion.div
                      className="absolute -inset-2 rounded-full border-2 border-emerald-500/30 z-10"
                      animate={{
                        scale: [1, 1.08, 1],
                        opacity: [0.4, 0, 0.4],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    {/* Video element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={cn(
                        'w-full h-full object-cover transition-all duration-500',
                        faceState === 'processing' && 'blur-sm scale-105',
                        faceState === 'success' && 'blur-sm scale-105 brightness-110',
                        faceState === 'failure' && 'blur-sm scale-105 brightness-75',
                      )}
                    />
                    {/* Processing overlay */}
                    {faceState === 'processing' && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 rounded-full">
                        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
                      </div>
                    )}
                    {/* Success overlay */}
                    {faceState === 'success' && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-full">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                      </div>
                    )}
                    {/* Failure overlay */}
                    {faceState === 'failure' && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-500/20 rounded-full">
                        <AlertTriangle className="h-12 w-12 text-rose-400" />
                      </div>
                    )}
                  </div>

                  {/* Canvas for frame capture (hidden) */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Status text */}
                  <AnimatePresence mode="wait">
                    {faceState === 'idle' && (
                      <motion.p
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-muted-foreground"
                      >
                        Initializing camera...
                      </motion.p>
                    )}
                    {faceState === 'camera-on' && (
                      <motion.p
                        key="camera-on"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-muted-foreground"
                      >
                        Position your face within the frame
                      </motion.p>
                    )}
                    {faceState === 'liveness' && (
                      <motion.div
                        key="liveness"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center space-y-1"
                      >
                        <p className={cn(
                          'text-sm font-medium',
                          livenessConfirmed ? 'text-emerald-400' : 'text-amber-400'
                        )}>
                          {livenessMessage || 'Please blink slowly'}
                        </p>
                        {!livenessConfirmed && (
                          <motion.p
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-xs text-muted-foreground"
                          >
                            Looking for motion...
                          </motion.p>
                        )}
                      </motion.div>
                    )}
                    {faceState === 'processing' && (
                      <motion.p
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-emerald-400"
                      >
                        Verifying face...
                      </motion.p>
                    )}
                    {faceState === 'success' && (
                      <motion.p
                        key="success"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-emerald-400 font-medium"
                      >
                        {successMessage}
                      </motion.p>
                    )}
                    {faceState === 'failure' && (
                      <motion.p
                        key="failure"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm text-rose-400"
                      >
                        Face not recognized. Try PIN instead.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Clock In/Out button for Face */}
                  {faceState === 'liveness' && (
                    <Button
                      onClick={handleFaceClockIn}
                      disabled={!livenessConfirmed}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-base disabled:opacity-50"
                    >
                      {livenessConfirmed ? punchTypeLabel : 'Confirm liveness first...'}
                    </Button>
                  )}
                </motion.div>
              )}

              {/* PIN PAD FLOW */}
              {method === 'pin' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* PIN display */}
                  <div className="flex justify-center gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={pin.length === i ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3, repeat: pin.length === i ? Infinity : 0 }}
                        className={cn(
                          'w-12 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-mono transition-colors',
                          pin.length > i
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : pin.length === i
                              ? 'border-emerald-500/50 bg-white/5'
                              : 'border-white/10 bg-white/5'
                        )}
                      >
                        {pin.length > i ? '●' : ''}
                      </motion.div>
                    ))}
                  </div>

                  {/* Number pad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {pinPadDigits.map((digit, i) => {
                      if (digit === '') {
                        return <div key={i} />;
                      }
                      if (digit === 'del') {
                        return (
                          <Button
                            key={i}
                            variant="outline"
                            onClick={handlePinDelete}
                            className="h-12 border-white/10 hover:bg-white/10 text-muted-foreground"
                          >
                            ←
                          </Button>
                        );
                      }
                      return (
                        <Button
                          key={i}
                          variant="outline"
                          onClick={() => handlePinDigit(digit)}
                          className="h-12 text-lg font-mono border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:bg-emerald-500/20"
                        >
                          {digit}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={handlePinClockIn}
                    disabled={loading || pin.length < 4}
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-base"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      punchTypeLabel
                    )}
                  </Button>
                </motion.div>
              )}

              {/* MANUAL PUNCH FLOW (admin/manager only) */}
              {method === 'manual' && isAdminOrManager && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 flex items-center gap-1.5">
                      <UserCog className="h-3.5 w-3.5" />
                      Manual punch — this action will be logged
                    </p>
                  </div>

                  {/* User select */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Select Employee</label>
                    <Select value={manualUserId} onValueChange={setManualUserId}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.id).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} — {u.department || 'No Dept'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Punch type */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Punch Type</label>
                    <Select value={manualPunchType} onValueChange={(v: 'clock-in' | 'clock-out') => setManualPunchType(v)}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clock-in">Clock In</SelectItem>
                        <SelectItem value="clock-out">Clock Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time input */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Time</label>
                    <Input
                      type="time"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <Button
                    onClick={handleManualPunch}
                    disabled={loading || !manualUserId || !manualTime}
                    className="w-full h-12 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-medium text-base"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Record Manual Punch'
                    )}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

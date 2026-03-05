import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  QrCode, 
  CheckCircle2, 
  Image as ImageIcon, 
  Printer, 
  Share2, 
  ArrowRight, 
  RefreshCcw,
  Sparkles,
  Timer,
  CreditCard,
  Zap,
  Download,
  Phone,
  Send,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

// --- Types ---
type AppState = 'WELCOME' | 'PACKAGE' | 'PAYMENT' | 'CAPTURE' | 'PROCESSING' | 'RESULT' | 'WHATSAPP';

interface PhotoPackage {
  id: string;
  name: string;
  price: number;
  shots: number;
  prints: number;
  description: string;
  color: string;
}

const PACKAGES: PhotoPackage[] = [
  { id: 'BASIC', name: 'Basic Strip', price: 35000, shots: 3, prints: 1, description: '1 Photostrip (3 shots)', color: 'bg-blue-500' },
  { id: 'PRO', name: 'Pro Collage', price: 50000, shots: 4, prints: 2, description: '2 Photostrips (4 shots)', color: 'bg-indigo-600' },
  { id: 'ULTIMATE', name: 'Ultimate AI', price: 75000, shots: 6, prints: 4, description: '4 Photostrips + AI Retouch', color: 'bg-purple-600' },
];

// --- Gallery Component ---
const GalleryPage = ({ sessionId }: { sessionId: string }) => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSessionData(data);
        }
      } catch (err) {
        console.error("Gallery fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!sessionData) return (
    <div className="h-screen flex flex-col items-center justify-center bg-neutral-950 p-8 text-center">
      <h1 className="text-4xl font-black mb-4">GALLERY NOT FOUND</h1>
      <p className="text-neutral-400">The link might be expired or incorrect.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">SNAPPRO GALLERY</h1>
            <p className="text-neutral-500">Captured on {new Date(sessionData.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="p-3 bg-indigo-600 rounded-2xl">
            <Camera size={24} />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-neutral-400 uppercase tracking-widest">Photostrip</h2>
            <div className="bg-white p-4 rounded-3xl shadow-2xl">
              <img src={sessionData.photostrip} alt="Photostrip" className="w-full h-auto rounded-xl" referrerPolicy="no-referrer" />
            </div>
            <a 
              href={sessionData.photostrip} 
              download={`photostrip-${sessionId}.png`}
              className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Download size={20} /> DOWNLOAD STRIP
            </a>
          </div>

          <div className="space-y-8">
            <h2 className="text-xl font-bold text-neutral-400 uppercase tracking-widest">Individual Photos</h2>
            <div className="grid grid-cols-2 gap-4">
              {sessionData.photos.map((url: string, i: number) => (
                <div key={i} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-white/5">
                  <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <a 
                    href={url} 
                    download={`photo-${i+1}.jpg`}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download size={24} />
                  </a>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'My SnapPro Photobooth Gallery',
                    url: window.location.href
                  });
                }
              }}
              className="flex items-center justify-center gap-3 w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-colors"
            >
              <Share2 size={20} /> SHARE GALLERY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [state, setState] = useState<AppState>('WELCOME');
  const [selectedPackage, setSelectedPackage] = useState<PhotoPackage | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentShot, setCurrentShot] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalStrip, setFinalStrip] = useState<string | null>(null);
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
  const [galleryQr, setGalleryQr] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for gallery route
  const path = window.location.pathname;
  if (path.startsWith('/gallery/')) {
    const sessionId = path.split('/')[2];
    return <GalleryPage sessionId={sessionId} />;
  }

  // --- Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const createTransaction = async (pkg: PhotoPackage) => {
    setSelectedPackage(pkg);
    setState('PAYMENT');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, amount: pkg.price })
      });
      const data = await res.json();
      setTransactionId(data.transactionId);
      setQrCodeUrl(data.qrCode);

      // Simulate payment success after 5 seconds
      setTimeout(() => simulatePaymentSuccess(data.transactionId), 5000);
    } catch (err) {
      console.error("Payment creation error:", err);
    }
  };

  const simulatePaymentSuccess = async (id: string) => {
    await fetch('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, status: 'SUCCESS' })
    });
    setState('CAPTURE');
    startCamera();
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedPhotos(prev => [...prev, dataUrl]);
        return dataUrl;
      }
    }
    return null;
  };

  const startPhotoSession = () => {
    if (!selectedPackage) return;
    
    let shotsTaken = 0;
    const totalShots = selectedPackage.shots;

    const nextShot = () => {
      if (shotsTaken < totalShots) {
        setCountdown(5);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev === 1) {
              clearInterval(timer);
              takePhoto();
              shotsTaken++;
              setCurrentShot(shotsTaken);
              setTimeout(nextShot, 1000);
              return null;
            }
            return prev ? prev - 1 : null;
          });
        }, 1000);
      } else {
        processPhotos();
      }
    };

    nextShot();
  };

  const processPhotos = async () => {
    setState('PROCESSING');
    setIsProcessing(true);
    stopCamera();

    // Generate strip first
    const strip = generatePhotostrip();
    
    // Upload to "Cloud"
    try {
      const res = await fetch('/api/sessions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          photos: capturedPhotos,
          photostrip: strip
        })
      });
      const data = await res.json();
      setGalleryUrl(data.galleryUrl);
      setGalleryQr(data.qrCode);
    } catch (err) {
      console.error("Cloud upload error:", err);
    }

    setTimeout(() => {
      setIsProcessing(false);
      setState('RESULT');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 3000);
  };

  const generatePhotostrip = () => {
    if (!canvasRef.current) return null;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return null;

    const stripWidth = 400;
    const padding = 20;
    const photoHeight = 250;
    const headerHeight = 80;
    const footerHeight = 100;
    const totalHeight = headerHeight + (photoHeight + padding) * capturedPhotos.length + footerHeight;

    canvasRef.current.width = stripWidth;
    canvasRef.current.height = totalHeight;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, stripWidth, totalHeight);

    // Header
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('SNAPPRO AI', stripWidth / 2, 50);

    // Photos
    capturedPhotos.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      // Note: In a real app we'd wait for all images to load before returning the dataURL
      // For this demo, we assume they are already in memory as dataURLs
      ctx.drawImage(img, padding, headerHeight + index * (photoHeight + padding), stripWidth - padding * 2, photoHeight);
    });

    // Footer
    ctx.fillStyle = '#6366f1';
    ctx.font = '14px Inter';
    ctx.fillText('Thank you for using SnapPro!', stripWidth / 2, totalHeight - 60);
    ctx.fillText(new Date().toLocaleDateString(), stripWidth / 2, totalHeight - 40);
    
    const stripData = canvasRef.current.toDataURL('image/png');
    setFinalStrip(stripData);
    return stripData;
  };

  const sendWhatsApp = async () => {
    if (!phoneNumber || !galleryUrl) return;
    setIsSendingWa(true);
    try {
      await fetch('/api/sessions/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, galleryUrl })
      });
      alert("Link sent to WhatsApp!");
      setState('RESULT');
    } catch (err) {
      console.error("WA error:", err);
    } finally {
      setIsSendingWa(false);
    }
  };

  const reset = () => {
    setState('WELCOME');
    setCapturedPhotos([]);
    setCurrentShot(0);
    setFinalStrip(null);
    setSelectedPackage(null);
    setGalleryUrl(null);
    setGalleryQr(null);
    setPhoneNumber('');
  };

  // --- Renderers ---

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        
        {/* WELCOME SCREEN */}
        {state === 'WELCOME' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col items-center justify-center p-8 relative"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15),transparent_70%)]" />
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="z-10 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/20">
                  <Camera size={64} className="text-white" />
                </div>
              </div>
              <h1 className="text-7xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                SNAPPRO AI
              </h1>
              <p className="text-xl text-neutral-400 mb-12 max-w-md mx-auto font-light leading-relaxed">
                The most advanced self-service photobooth experience. Professional quality, AI-powered.
              </p>
              
              <button 
                onClick={() => setState('PACKAGE')}
                className="group relative px-12 py-6 bg-white text-black rounded-full text-2xl font-bold overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-3">
                  TAP TO START <ArrowRight size={28} />
                </span>
                <div className="absolute inset-0 bg-indigo-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </motion.div>

            <div className="absolute bottom-12 left-0 right-0 text-center text-neutral-600 text-sm tracking-widest uppercase font-medium">
              Powered by Google Gemini AI & QRIS Indonesia
            </div>
          </motion.div>
        )}

        {/* PACKAGE SELECTION */}
        {state === 'PACKAGE' && (
          <motion.div 
            key="package"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="h-screen flex flex-col p-12"
          >
            <div className="mb-12">
              <h2 className="text-5xl font-black tracking-tight mb-2">CHOOSE PACKAGE</h2>
              <p className="text-neutral-400 text-lg">Select your preferred photobooth experience</p>
            </div>

            <div className="grid grid-cols-3 gap-8 flex-1">
              {PACKAGES.map((pkg) => (
                <motion.div 
                  key={pkg.id}
                  whileHover={{ y: -10 }}
                  onClick={() => createTransaction(pkg)}
                  className="bg-neutral-900 border border-white/5 rounded-[2rem] p-8 flex flex-col cursor-pointer transition-colors hover:border-indigo-500/50 group"
                >
                  <div className={`w-16 h-16 ${pkg.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg`}>
                    {pkg.id === 'ULTIMATE' ? <Sparkles className="text-white" /> : <ImageIcon className="text-white" />}
                  </div>
                  <h3 className="text-3xl font-bold mb-2">{pkg.name}</h3>
                  <p className="text-neutral-500 mb-8 flex-1">{pkg.description}</p>
                  <div className="mt-auto">
                    <div className="text-4xl font-black mb-6">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </div>
                    <div className="w-full py-4 bg-white/5 rounded-2xl text-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      SELECT
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button onClick={() => setState('WELCOME')} className="mt-8 text-neutral-500 hover:text-white flex items-center gap-2 transition-colors">
              <RefreshCcw size={18} /> BACK TO START
            </button>
          </motion.div>
        )}

        {/* PAYMENT SCREEN */}
        {state === 'PAYMENT' && (
          <motion.div 
            key="payment"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-screen flex items-center justify-center p-12"
          >
            <div className="bg-white text-black rounded-[3rem] p-12 w-full max-w-4xl flex gap-12 shadow-2xl shadow-indigo-500/20">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-8 text-indigo-600">
                  <CreditCard size={32} />
                  <span className="font-black text-2xl tracking-tight">PAYMENT</span>
                </div>
                <h2 className="text-5xl font-black mb-4 leading-tight">SCAN TO PAY WITH QRIS</h2>
                <p className="text-neutral-500 text-xl mb-8">
                  Open your banking app or e-wallet (Gopay, OVO, Dana) to scan the QR code.
                </p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-6 bg-neutral-50 rounded-2xl">
                    <span className="text-neutral-500 font-medium">Package</span>
                    <span className="font-bold text-xl">{selectedPackage?.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-indigo-50 rounded-2xl">
                    <span className="text-indigo-600 font-medium">Total Amount</span>
                    <span className="font-black text-3xl text-indigo-600">Rp {selectedPackage?.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="mt-12 flex items-center gap-4 text-neutral-400">
                  <Zap size={20} className="animate-pulse text-amber-500" />
                  <span>Waiting for payment detection...</span>
                </div>
              </div>

              <div className="w-96 flex flex-col items-center justify-center border-l border-neutral-100 pl-12">
                {qrCodeUrl ? (
                  <div className="p-4 bg-white border-4 border-neutral-100 rounded-3xl shadow-xl">
                    <img src={qrCodeUrl} alt="QRIS Code" className="w-64 h-64" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-neutral-100 rounded-3xl animate-pulse" />
                )}
                <div className="mt-8 flex gap-4 grayscale opacity-50">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg" alt="QRIS" className="h-8" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CAPTURE SCREEN */}
        {state === 'CAPTURE' && (
          <motion.div 
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col bg-black relative"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

            <div className="z-10 flex flex-col h-full p-12 justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">GET READY!</h2>
                  <p className="text-neutral-300">Shot {currentShot + 1} of {selectedPackage?.shots}</p>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: selectedPackage?.shots || 0 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-12 h-2 rounded-full transition-all ${i < currentShot ? 'bg-green-500' : i === currentShot ? 'bg-white w-24' : 'bg-white/20'}`} 
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center">
                {countdown !== null ? (
                  <motion.div 
                    key={countdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[15rem] font-black text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)]"
                  >
                    {countdown}
                  </motion.div>
                ) : (
                  capturedPhotos.length === 0 && (
                    <button 
                      onClick={startPhotoSession}
                      className="px-12 py-6 bg-indigo-600 rounded-full text-3xl font-black hover:scale-105 transition-transform shadow-2xl shadow-indigo-500/50"
                    >
                      START SESSION
                    </button>
                  )
                )}
              </div>

              <div className="flex justify-center gap-4 overflow-x-auto pb-4">
                {capturedPhotos.map((photo, i) => (
                  <motion.img 
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    key={i} 
                    src={photo} 
                    className="h-32 w-48 object-cover rounded-2xl border-2 border-white/20 shadow-xl" 
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* PROCESSING SCREEN */}
        {state === 'PROCESSING' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col items-center justify-center p-12"
          >
            <div className="relative">
              <div className="w-48 h-48 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={48} className="text-indigo-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-5xl font-black mt-12 mb-4">UPLOADING TO CLOUD</h2>
            <p className="text-neutral-400 text-xl max-w-md text-center">
              Generating your unique gallery link and QR code...
            </p>
          </motion.div>
        )}

        {/* RESULT SCREEN */}
        {state === 'RESULT' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-screen flex p-12 gap-12"
          >
            <div className="flex-1 flex flex-col">
              <div className="mb-12">
                <div className="flex items-center gap-3 text-green-500 mb-2">
                  <CheckCircle2 size={32} />
                  <span className="font-bold text-2xl">COMPLETED</span>
                </div>
                <h2 className="text-6xl font-black tracking-tighter">LOOKS AMAZING!</h2>
              </div>

              <div className="grid grid-cols-2 gap-6 flex-1">
                <button className="flex flex-col items-center justify-center bg-white text-black rounded-[2.5rem] p-8 hover:scale-[1.02] transition-transform group">
                  <div className="w-20 h-20 bg-neutral-100 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Printer size={40} />
                  </div>
                  <span className="text-2xl font-black">PRINT NOW</span>
                  <span className="text-neutral-500 mt-2">{selectedPackage?.prints} Copies Remaining</span>
                </button>

                <div className="flex flex-col items-center justify-center bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 relative group overflow-hidden">
                  {galleryQr ? (
                    <div className="flex flex-col items-center">
                      <div className="p-2 bg-white rounded-xl mb-4">
                        <img src={galleryQr} alt="Gallery QR" className="w-24 h-24" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-xl font-black">SCAN TO DOWNLOAD</span>
                      <a href={galleryUrl || '#'} target="_blank" className="text-indigo-400 text-sm mt-2 flex items-center gap-1 hover:underline">
                        Open Gallery <ExternalLink size={12} />
                      </a>
                    </div>
                  ) : (
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-24 h-24 bg-white/5 rounded-xl mb-4" />
                      <div className="h-6 w-32 bg-white/5 rounded" />
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setState('WHATSAPP')}
                  className="flex flex-col items-center justify-center bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 hover:scale-[1.02] transition-transform group"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                    <Phone size={40} />
                  </div>
                  <span className="text-2xl font-black">WHATSAPP</span>
                  <span className="text-neutral-500 mt-2">Send Link to Phone</span>
                </button>

                <button 
                  onClick={reset}
                  className="flex flex-col items-center justify-center bg-indigo-600 rounded-[2.5rem] p-8 hover:scale-[1.02] transition-transform"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
                    <RefreshCcw size={40} />
                  </div>
                  <span className="text-2xl font-black">NEW SESSION</span>
                  <span className="text-indigo-200 mt-2">Finish and Exit</span>
                </button>
              </div>
            </div>

            <div className="w-[450px] bg-neutral-900 rounded-[3rem] p-8 flex flex-col items-center shadow-2xl border border-white/5">
              <h3 className="text-neutral-500 font-bold mb-6 tracking-widest uppercase text-sm">PREVIEW STRIP</h3>
              <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden shadow-inner relative">
                {finalStrip ? (
                  <img src={finalStrip} alt="Final Photostrip" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Timer size={48} className="text-neutral-200 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* WHATSAPP INPUT SCREEN */}
        {state === 'WHATSAPP' && (
          <motion.div 
            key="whatsapp"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-screen flex items-center justify-center p-12"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-[3rem] p-12 w-full max-w-2xl text-center shadow-2xl">
              <div className="w-24 h-24 bg-green-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-600/20">
                <Phone size={48} />
              </div>
              <h2 className="text-5xl font-black mb-4">SEND TO WHATSAPP</h2>
              <p className="text-neutral-400 text-xl mb-12">
                Enter your phone number to receive the download link for your photos.
              </p>

              <div className="relative mb-8">
                <input 
                  type="tel" 
                  placeholder="e.g. 08123456789" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-black border-2 border-white/10 rounded-2xl py-6 px-8 text-3xl font-bold focus:border-green-500 outline-none transition-colors text-center"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setState('RESULT')}
                  className="flex-1 py-6 bg-white/5 rounded-2xl text-xl font-bold hover:bg-white/10 transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  onClick={sendWhatsApp}
                  disabled={!phoneNumber || isSendingWa}
                  className="flex-1 py-6 bg-green-600 rounded-2xl text-xl font-bold flex items-center justify-center gap-3 hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSendingWa ? <RefreshCcw className="animate-spin" /> : <Send />} SEND LINK
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

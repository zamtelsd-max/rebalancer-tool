import { useState } from 'react';
import toast from 'react-hot-toast';
interface Props { onCapture: (lat: number, lng: number) => void; lat: number | null; lng: number | null }
export default function GPSButton({ onCapture, lat, lng }: Props) {
  const [loading, setLoading] = useState(false);
  const capture = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { onCapture(p.coords.latitude, p.coords.longitude); setLoading(false); toast.success('📍 GPS captured'); },
      e => { setLoading(false); toast.error(`GPS error: ${e.message}`); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  return (
    <button type="button" onClick={capture} disabled={loading}
      className={`w-full py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${lat ? 'border-green-400 bg-green-50 text-green-700' : 'border-dashed border-gray-300 text-gray-500 hover:border-brand-blue hover:text-brand-blue'} disabled:opacity-50`}>
      {loading ? '⌛ Getting GPS…' : lat ? `✅ ${lat.toFixed(5)}, ${lng?.toFixed(5)}` : '📍 Capture GPS Location (required)'}
    </button>
  );
}

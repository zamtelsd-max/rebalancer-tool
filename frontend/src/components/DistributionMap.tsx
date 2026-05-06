import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fmtZMW } from '../utils/fmt';

export interface MapPoint {
  id: string; lat: number; lng: number;
  agentCode: string; agentName: string;
  type: 'CASH' | 'FLOAT'; amount: number;
  rebalancer: string; createdAt: string;
}

interface Props { points: MapPoint[]; height?: string }

// Fix Leaflet default icon paths (Vite asset handling)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const cashIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#003DA5;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;">💵</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});
const floatIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#D4A017;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;">📱</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

export default function DistributionMap({ points, height = '280px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: false }).setView([-13.5, 28.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM', maxZoom: 18 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer(l => { if ((l as any)._isDistMarker) map.removeLayer(l); });

    if (points.length === 0) return;

    const bounds: [number, number][] = [];
    points.forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon: p.type === 'CASH' ? cashIcon : floatIcon }) as any;
      marker._isDistMarker = true;
      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:160px">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px">${p.agentName}</p>
          <p style="color:#6b7280;font-size:11px;margin:0 0 2px;font-family:monospace">${p.agentCode}</p>
          <p style="font-size:12px;font-weight:700;color:${p.type === 'CASH' ? '#003DA5' : '#D4A017'};margin:4px 0 2px">
            ${p.type === 'CASH' ? '💵' : '📱'} ${fmtZMW(p.amount)}
          </p>
          <p style="color:#6b7280;font-size:10px;margin:0">by ${p.rebalancer}</p>
        </div>
      `);
      marker.addTo(map);
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points]);

  return (
    <div style={{ height, borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <div ref={ref} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PontoMapa {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  detalhe: string;
}

/** Mapa real (Leaflet + OpenStreetMap). Marcadores desenhados (sem imagem), clique abre a clínica.
 *  A lista é sempre a alternativa acessível: o mapa é complemento. */
export function MapaClinicas({ pontos, voce, aoEscolher }: { pontos: PontoMapa[]; voce?: { lat: number; lng: number } | null; aoEscolher: (id: string) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!caixa.current) return;
    const m = L.map(caixa.current, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const camada = L.layerGroup().addTo(m);
    const limites: L.LatLngExpression[] = [];
    for (const p of pontos) {
      L.circleMarker([p.lat, p.lng], { radius: 11, color: "#0b2423", weight: 3, fillColor: "#14beb9", fillOpacity: 1 })
        .bindTooltip(`${p.nome} · ${p.detalhe}`)
        .on("click", () => aoEscolher(p.id))
        .addTo(camada);
      limites.push([p.lat, p.lng]);
    }
    if (voce) {
      L.circleMarker([voce.lat, voce.lng], { radius: 8, color: "#0b2423", weight: 3, fillColor: "#ffb81c", fillOpacity: 1 })
        .bindTooltip("Você").addTo(camada);
      limites.push([voce.lat, voce.lng]);
    }
    if (limites.length) m.fitBounds(L.latLngBounds(limites), { padding: [28, 28], maxZoom: 14 });
    return () => { camada.remove(); };
  }, [pontos, voce, aoEscolher]);

  return <div ref={caixa} className="d-mapa" role="application" aria-label="Mapa das clínicas. A mesma informação está na lista." />;
}

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// --- Yandex Maps global type ---
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps: any;
  }
}

// --- Types ---
type IncidentType = "dtp" | "fire" | "accident";
type Tab = "map" | "feed" | "report" | "history" | "profile" | "help";

interface Incident {
  id: number;
  type: IncidentType;
  title: string;
  address: string;
  time: string;
  distance?: string;
  description: string;
  lat: number;
  lng: number;
  status: "active" | "resolved";
}

// --- Mock Data ---
const INCIDENTS: Incident[] = [
  { id: 1, type: "dtp", title: "ДТП с пострадавшими", address: "ул. Ленина, 45", time: "5 мин назад", distance: "0.8 км", description: "Столкновение двух автомобилей. Пострадавших нет. Движение затруднено.", lat: 55.751244, lng: 37.618423, status: "active" },
  { id: 2, type: "fire", title: "Пожар в здании", address: "пр. Мира, 12", time: "18 мин назад", distance: "2.1 км", description: "Возгорание на 3-м этаже жилого дома. Пожарные на месте.", lat: 55.764450, lng: 37.605700, status: "active" },
  { id: 3, type: "accident", title: "Коммунальная авария", address: "ул. Садовая, 78", time: "32 мин назад", distance: "3.4 км", description: "Прорыв водопровода. Перекрыто движение на перекрёстке.", lat: 55.740900, lng: 37.630100, status: "active" },
  { id: 4, type: "dtp", title: "ДТП (незначительное)", address: "Кутузовский пр., 4", time: "1 ч назад", distance: "4.7 км", description: "Небольшое столкновение, помощь не требуется.", lat: 55.745000, lng: 37.565000, status: "resolved" },
  { id: 5, type: "fire", title: "Возгорание автомобиля", address: "ул. Тверская, 23", time: "2 ч назад", distance: "5.2 км", description: "Загорелся припаркованный автомобиль. МЧС прибыло.", lat: 55.770000, lng: 37.610000, status: "resolved" },
];

const TYPE_CONFIG = {
  dtp:      { label: "ДТП",           color: "bg-red-500",    light: "bg-red-50 text-red-700 border-red-200",          icon: "Car",    dot: "#ef4444" },
  fire:     { label: "Пожар",         color: "bg-orange-500", light: "bg-orange-50 text-orange-700 border-orange-200", icon: "Flame",  dot: "#f97316" },
  accident: { label: "Авария",        color: "bg-blue-500",   light: "bg-blue-50 text-blue-700 border-blue-200",       icon: "Wrench", dot: "#3b82f6" },
};

// --- Yandex Map Component ---
function YandexMap({ incidents, onSelect, selected, onAddMarker }: {
  incidents: Incident[];
  onSelect: (i: Incident) => void;
  selected: Incident | null;
  onAddMarker?: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ymapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Инициализация карты
  useEffect(() => {
    const init = () => {
      if (!mapRef.current || ymapRef.current) return;
      window.ymaps.ready(() => {
        const map = new window.ymaps.Map(mapRef.current, {
          center: [55.751244, 37.618423],
          zoom: 12,
          controls: ["zoomControl", "geolocationControl"],
        }, {
          suppressMapOpenBlock: true,
        });

        // Клик по карте — добавить метку
        map.events.add("click", (e: { get: (key: string) => [number, number] }) => {
          const coords = e.get("coords");
          if (onAddMarker) onAddMarker(coords[0], coords[1]);
        });

        ymapRef.current = map;
        setMapReady(true);

        // Геолокация пользователя
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(loc);
            map.setCenter(loc, 13);

            const userMark = new window.ymaps.Placemark(loc, {
              hintContent: "Вы здесь",
            }, {
              preset: "islands#blueCircleDotIcon",
            });
            map.geoObjects.add(userMark);
          });
        }
      });
    };

    if (window.ymaps) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.ymaps) { clearInterval(interval); init(); }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  // Обновление маркеров инцидентов
  useEffect(() => {
    if (!ymapRef.current || !mapReady) return;

    // Удаляем старые маркеры
    markersRef.current.forEach(m => ymapRef.current.geoObjects.remove(m));
    markersRef.current = [];

    incidents.forEach((inc) => {
      const cfg = TYPE_CONFIG[inc.type];
      const isSelected = selected?.id === inc.id;

      const placemark = new window.ymaps.Placemark(
        [inc.lat, inc.lng],
        {
          balloonContentHeader: `<b>${inc.title}</b>`,
          balloonContentBody: `<span style="color:#666;font-size:12px">${inc.address}</span><br/><span style="font-size:12px">${inc.description}</span>`,
          balloonContentFooter: `<span style="color:#999;font-size:11px">${inc.time}</span>`,
          hintContent: inc.title,
        },
        {
          iconLayout: "default#image",
          iconImageHref: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 44 : 36}" height="${isSelected ? 44 : 36}" viewBox="0 0 44 44">
              ${inc.status === "active" ? `<circle cx="22" cy="22" r="20" fill="${cfg.dot}" opacity="0.18"/>` : ""}
              <circle cx="22" cy="22" r="${isSelected ? 14 : 11}" fill="${inc.status === "resolved" ? "#aaa" : cfg.dot}" stroke="white" stroke-width="3"/>
            </svg>
          `)}`,
          iconImageSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconImageOffset: [isSelected ? -22 : -18, isSelected ? -22 : -18],
        }
      );

      placemark.events.add("click", () => onSelect(inc));
      ymapRef.current.geoObjects.add(placemark);
      markersRef.current.push(placemark);
    });
  }, [incidents, mapReady, selected]);

  // Центрировать на выбранном инциденте
  useEffect(() => {
    if (selected && ymapRef.current) {
      ymapRef.current.setCenter([selected.lat, selected.lng], 14, { duration: 400 });
    }
  }, [selected]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />

      {!mapReady && (
        <div className="absolute inset-0 bg-[#f0ede8] flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Загрузка карты...</span>
          </div>
        </div>
      )}

      {/* Легенда */}
      {mapReady && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow border border-border pointer-events-none">
          <p className="text-[10px] text-muted-foreground font-medium mb-1.5 uppercase tracking-wider">Легенда</p>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot }} />
              <span className="text-xs">{cfg.label}</span>
            </div>
          ))}
          {userLocation && (
            <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs">Вы здесь</span>
            </div>
          )}
        </div>
      )}

      {/* Подсказка по клику */}
      {mapReady && onAddMarker && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow border border-border pointer-events-none">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Icon name="MousePointer" size={11} />
            Нажмите на карту, чтобы добавить инцидент
          </p>
        </div>
      )}
    </div>
  );
}

// --- Incident Card ---
function IncidentCard({ incident, onClick, compact = false }: {
  incident: Incident; onClick?: () => void; compact?: boolean;
}) {
  const cfg = TYPE_CONFIG[incident.type];
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border border-border p-4 card-hover ${onClick ? "cursor-pointer" : ""} ${compact ? "py-3" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.dot}18` }}>
            <Icon name={cfg.icon as string} size={18} style={{ color: cfg.dot }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.light}`}>{cfg.label}</span>
              {incident.status === "resolved" && (
                <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Закрыто</span>
              )}
            </div>
            <p className="font-semibold text-sm mt-1">{incident.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{incident.address}</p>
            {!compact && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{incident.description}</p>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">{incident.time}</p>
          {incident.distance && <p className="text-xs font-medium mt-0.5">{incident.distance}</p>}
        </div>
      </div>
    </div>
  );
}

// --- MAP TAB ---
function MapTab() {
  const [selected, setSelected] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<IncidentType | "all">("all");
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [newType, setNewType] = useState<IncidentType>("dtp");
  const [newTitle, setNewTitle] = useState("");

  const filtered = filter === "all" ? incidents : incidents.filter(i => i.type === filter);

  const handleAddMarker = (lat: number, lng: number) => {
    setNewMarker({ lat, lng });
    setNewTitle("");
  };

  const handleSaveMarker = () => {
    if (!newMarker || !newTitle.trim()) return;
    const inc: Incident = {
      id: Date.now(),
      type: newType,
      title: newTitle,
      address: `${newMarker.lat.toFixed(5)}, ${newMarker.lng.toFixed(5)}`,
      time: "только что",
      description: "Добавлено пользователем",
      lat: newMarker.lat,
      lng: newMarker.lng,
      status: "active",
    };
    setIncidents(prev => [inc, ...prev]);
    setSelected(inc);
    setNewMarker(null);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
        {[{ key: "all", label: "Все" }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as IncidentType | "all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
              filter === f.key ? "bg-foreground text-background border-foreground" : "bg-white text-muted-foreground border-border hover:border-foreground/30"
            }`}>{f.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">В эфире</span>
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ minHeight: 300 }}>
        <YandexMap
          incidents={filtered}
          onSelect={setSelected}
          selected={selected}
          onAddMarker={handleAddMarker}
        />
      </div>

      {/* Форма добавления нового маркера */}
      {newMarker && (
        <div className="animate-slide-up flex-shrink-0 bg-white rounded-xl border-2 border-foreground p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Новый инцидент</p>
            <button onClick={() => setNewMarker(null)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={16} />
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button key={key} type="button" onClick={() => setNewType(key as IncidentType)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  newType === key ? "border-foreground bg-white" : "border-border"
                }`} style={{ color: newType === key ? cfg.dot : undefined }}>
                {cfg.label}
              </button>
            ))}
          </div>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Название инцидента..."
            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-xl focus:outline-none focus:border-foreground mb-3" />
          <div className="flex gap-2">
            <button onClick={() => setNewMarker(null)}
              className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors">
              Отмена
            </button>
            <button onClick={handleSaveMarker} disabled={!newTitle.trim()}
              className="flex-1 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Выбранный / список */}
      {!newMarker && (selected ? (
        <div className="animate-slide-up flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Выбранный инцидент</p>
            <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Закрыть</button>
          </div>
          <IncidentCard incident={selected} />
        </div>
      ) : (
        <div className="flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Активные инциденты</p>
          <div className="flex flex-col gap-2">
            {filtered.filter(i => i.status === "active").slice(0, 2).map(inc => (
              <IncidentCard key={inc.id} incident={inc} compact onClick={() => setSelected(inc)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- FEED TAB ---
function FeedTab() {
  const [activeType, setActiveType] = useState<IncidentType | "all">("all");
  const filtered = activeType === "all" ? INCIDENTS : INCIDENTS.filter(i => i.type === activeType);
  const active = filtered.filter(i => i.status === "active");
  const resolved = filtered.filter(i => i.status === "resolved");

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = INCIDENTS.filter(i => i.type === key && i.status === "active").length;
          return (
            <div key={key} className="bg-white rounded-xl p-3 border border-border text-center card-hover cursor-pointer"
              onClick={() => setActiveType(key === activeType ? "all" : key as IncidentType)}>
              <div className="text-2xl font-bold" style={{ color: cfg.dot }}>{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {[{ key: "all", label: "Все" }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setActiveType(f.key as IncidentType | "all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeType === f.key ? "bg-foreground text-background border-foreground" : "bg-white text-muted-foreground border-border hover:border-foreground/30"
            }`}>{f.label}</button>
        ))}
      </div>

      {active.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Активные</p>
          <div className="flex flex-col gap-2">
            {active.map((inc, i) => (
              <div key={inc.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <IncidentCard incident={inc} />
              </div>
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Завершённые</p>
          <div className="flex flex-col gap-2 opacity-60">
            {resolved.map((inc, i) => (
              <div key={inc.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <IncidentCard incident={inc} compact />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// --- REPORT TAB ---
function ReportTab() {
  const [type, setType] = useState<IncidentType>("dtp");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { setSent(false); setAddress(""); setDescription(""); }, 3000);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-scale-in">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border-2 border-green-200">
          <Icon name="CheckCircle" size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold mb-1">Сообщение отправлено!</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">Ваш отчёт принят и передан модераторам. Спасибо за бдительность!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Тип инцидента</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button type="button" key={key} onClick={() => setType(key as IncidentType)}
              className={`rounded-xl p-3 border-2 flex flex-col items-center gap-1.5 transition-all ${
                type === key ? "border-foreground bg-white" : "border-border bg-white/50 hover:border-foreground/30"
              }`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cfg.dot}18` }}>
                <Icon name={cfg.icon as string} size={16} style={{ color: cfg.dot }} />
              </div>
              <span className="text-xs font-semibold">{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Адрес</label>
        <div className="relative">
          <Icon name="MapPin" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Введите адрес или выберите на карте"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-foreground transition-colors" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Описание</label>
          <span className="text-xs text-muted-foreground">{description.length}/300</span>
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 300))}
          placeholder="Опишите что произошло: количество пострадавших, текущая обстановка..."
          rows={4}
          className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-foreground transition-colors resize-none" />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Фото (необязательно)</label>
        <label className="flex items-center gap-3 bg-white border border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-foreground/40 transition-colors">
          <Icon name="Camera" size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Добавить фотографию</span>
        </label>
      </div>

      <button type="submit" disabled={!address || !description}
        className="bg-foreground text-background py-3 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <Icon name="Send" size={16} />
        Отправить сообщение
      </button>
    </form>
  );
}

// --- HISTORY TAB ---
function HistoryTab() {
  const myReports = INCIDENTS.slice(0, 3);
  const nearby = INCIDENTS.slice(1, 4);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Мои отчёты</p>
          <span className="text-xs text-muted-foreground">{myReports.length} записей</span>
        </div>
        <div className="flex flex-col gap-2">
          {myReports.map((inc, i) => (
            <div key={inc.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <IncidentCard incident={inc} compact />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Рядом со мной</p>
          <span className="text-xs text-muted-foreground">в радиусе 5 км</span>
        </div>
        <div className="flex flex-col gap-2">
          {nearby.map((inc, i) => (
            <div key={inc.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <IncidentCard incident={inc} compact />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- AUTH MODAL ---
function AuthModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const [mode, setMode] = useState<"choose" | "phone" | "email">("choose");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handlePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSent) { setCodeSent(true); return; }
    onLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground">
          <Icon name="X" size={16} />
        </button>

        {mode === "choose" && (
          <div>
            <div className="w-12 h-12 bg-foreground rounded-2xl flex items-center justify-center mb-4">
              <Icon name="Shield" size={22} className="text-background" />
            </div>
            <h2 className="text-xl font-bold mb-1">Войдите в аккаунт</h2>
            <p className="text-sm text-muted-foreground mb-6">Чтобы отправлять отчёты и получать уведомления</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setMode("phone")}
                className="w-full flex items-center gap-3 bg-foreground text-background py-3 px-4 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity">
                <Icon name="Phone" size={18} />
                Войти по номеру телефона
              </button>
              <button onClick={() => setMode("email")}
                className="w-full flex items-center gap-3 bg-white text-foreground py-3 px-4 rounded-xl font-semibold text-sm border-2 border-border hover:border-foreground/40 transition-colors">
                <Icon name="Mail" size={18} />
                Войти через Gmail
              </button>
            </div>
          </div>
        )}

        {mode === "phone" && (
          <form onSubmit={handlePhone}>
            <button type="button" onClick={() => setMode("choose")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
              <Icon name="ChevronLeft" size={14} />Назад
            </button>
            <h2 className="text-xl font-bold mb-1">{codeSent ? "Введите код" : "Номер телефона"}</h2>
            <p className="text-sm text-muted-foreground mb-5">
              {codeSent ? `Код отправлен на ${phone}` : "Мы пришлём SMS с кодом подтверждения"}
            </p>
            {!codeSent ? (
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 text-sm bg-secondary border border-border rounded-xl focus:outline-none focus:border-foreground transition-colors mb-4" />
            ) : (
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Код из SMS" maxLength={6}
                className="w-full px-4 py-3 text-sm bg-secondary border border-border rounded-xl focus:outline-none focus:border-foreground transition-colors mb-4 text-center text-xl tracking-widest font-bold" />
            )}
            <button type="submit" className="w-full bg-foreground text-background py-3 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity">
              {codeSent ? "Войти" : "Получить код"}
            </button>
          </form>
        )}

        {mode === "email" && (
          <div>
            <button type="button" onClick={() => setMode("choose")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
              <Icon name="ChevronLeft" size={14} />Назад
            </button>
            <h2 className="text-xl font-bold mb-1">Вход через Gmail</h2>
            <p className="text-sm text-muted-foreground mb-6">Используйте свой аккаунт Google для входа</p>
            <button onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-border py-3 px-4 rounded-xl font-semibold text-sm hover:border-foreground/40 transition-colors">
              <span className="text-lg font-bold">G</span>
              Войти через Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- PROFILE TAB ---
function ProfileTab({ onShowAuth, isLoggedIn }: { onShowAuth: () => void; isLoggedIn: boolean }) {
  const [notifications, setNotifications] = useState({ push: true, nearby: true, critical: true });

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-5 border-2 border-border">
          <Icon name="UserCircle" size={36} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold mb-2">Войдите в аккаунт</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">Сохраняйте свои отчёты, получайте персональные уведомления и настраивайте зоны оповещения</p>
        <button onClick={onShowAuth} className="bg-foreground text-background px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity">
          Войти / Зарегистрироваться
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center text-background text-xl font-bold flex-shrink-0">И</div>
        <div>
          <p className="font-bold">Иван Петров</p>
          <p className="text-sm text-muted-foreground">ivan@gmail.com</p>
          <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Верифицирован</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[{ label: "Отчётов", value: "12" }, { label: "Подтверждено", value: "9" }, { label: "Дней", value: "47" }].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-3 text-center">
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Уведомления</p>
        </div>
        {[
          { key: "push", label: "Push-уведомления", desc: "Оповещения на устройство" },
          { key: "nearby", label: "События рядом", desc: "В радиусе 5 км" },
          { key: "critical", label: "Критические", desc: "Пожары и ДТП с пострадавшими" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${notifications[item.key as keyof typeof notifications] ? "bg-foreground" : "bg-border"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {[
          { icon: "MapPin", label: "Зона оповещения" },
          { icon: "Bell", label: "Расписание уведомлений" },
          { icon: "Shield", label: "Конфиденциальность" },
        ].map(item => (
          <button key={item.label} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <Icon name={item.icon as string} size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

// --- HELP TAB ---
function HelpTab() {
  const [open, setOpen] = useState<number | null>(null);

  const faq = [
    { q: "Как отправить сообщение об инциденте?", a: "Нажмите на вкладку «Сообщить» в нижнем меню. Выберите тип события, укажите адрес и опишите ситуацию. При необходимости приложите фото. Отчёт пройдёт модерацию и появится на карте." },
    { q: "Как работает карта?", a: "На карте отображаются инциденты в реальном времени. Красные маркеры — ДТП, оранжевые — пожары, синие — коммунальные аварии. Нажмите на маркер, чтобы получить подробную информацию." },
    { q: "Как включить уведомления?", a: "Перейдите в раздел «Профиль» и включите нужный тип уведомлений. Можно настроить радиус оповещения и получать только критические события." },
    { q: "Как авторизоваться?", a: "Поддерживается вход через Gmail и по номеру телефона (SMS-код). Авторизация необходима для отправки отчётов и сохранения истории." },
  ];

  const emergency = [
    { icon: "🚒", label: "Пожарная служба", number: "101" },
    { icon: "🚑", label: "Скорая помощь", number: "103" },
    { icon: "🚔", label: "Полиция", number: "102" },
    { icon: "📞", label: "Единый экстренный", number: "112" },
  ];

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Экстренные службы</p>
        <div className="grid grid-cols-2 gap-2">
          {emergency.map(e => (
            <a key={e.number} href={`tel:${e.number}`}
              className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 card-hover">
              <span className="text-2xl">{e.icon}</span>
              <div>
                <p className="text-sm font-semibold">{e.label}</p>
                <p className="text-lg font-bold leading-none mt-0.5" style={{ color: "#ef4444" }}>{e.number}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Частые вопросы</p>
        <div className="flex flex-col gap-2">
          {faq.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}>
                <span className="text-sm font-medium pr-3">{item.q}</span>
                <Icon name={open === i ? "ChevronUp" : "ChevronDown"} size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
              {open === i && (
                <div className="px-4 pb-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Инструкция</p>
        <div className="flex flex-col gap-2">
          {[
            { step: "1", title: "Зарегистрируйтесь", desc: "Войдите через Gmail или телефон" },
            { step: "2", title: "Разрешите геолокацию", desc: "Для отображения событий рядом с вами" },
            { step: "3", title: "Следите за картой", desc: "Актуальные события в вашем районе" },
            { step: "4", title: "Сообщайте об инцидентах", desc: "Помогайте другим пользователям" },
          ].map(s => (
            <div key={s.step} className="bg-white rounded-xl border border-border p-4 flex items-start gap-4">
              <div className="w-8 h-8 bg-foreground text-background rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [tab, setTab] = useState<Tab>("map");
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: "map",     icon: "Map",        label: "Карта"    },
    { key: "feed",    icon: "Activity",   label: "Лента"    },
    { key: "report",  icon: "Plus",       label: "Сообщить" },
    { key: "history", icon: "Clock",      label: "История"  },
    { key: "profile", icon: "User",       label: "Профиль"  },
    { key: "help",    icon: "HelpCircle", label: "Помощь"   },
  ];

  const activeCount = INCIDENTS.filter(i => i.status === "active").length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-golos">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-foreground rounded-xl flex items-center justify-center">
            <Icon name="AlertTriangle" size={16} className="text-background" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">АвариОповест</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Система экстренного оповещения</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-700">{activeCount} активных</span>
          </div>
          {isLoggedIn ? (
            <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center text-background text-sm font-bold cursor-pointer">И</div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="text-xs font-semibold bg-foreground text-background px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">
              Войти
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "map"     && <MapTab />}
        {tab === "feed"    && <FeedTab />}
        {tab === "report"  && <ReportTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "profile" && <ProfileTab onShowAuth={() => setShowAuth(true)} isLoggedIn={isLoggedIn} />}
        {tab === "help"    && <HelpTab />}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-border px-2 pb-2 pt-1.5 flex-shrink-0 sticky bottom-0 z-40">
        <div className="flex items-end justify-around">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                t.key === "report" ? "" : tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground/60"
              }`}>
              {t.key === "report" ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    tab === t.key ? "bg-foreground scale-110" : "bg-foreground/90"
                  }`}>
                    <Icon name="Plus" size={22} className="text-background" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{t.label}</span>
                </div>
              ) : (
                <>
                  <div className={`relative p-1.5 rounded-lg transition-colors ${tab === t.key ? "bg-secondary" : ""}`}>
                    <Icon name={t.icon as string} size={20} />
                  </div>
                  <span className="text-[10px] font-medium">{t.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={() => { setIsLoggedIn(true); setShowAuth(false); }}
        />
      )}
    </div>
  );
}
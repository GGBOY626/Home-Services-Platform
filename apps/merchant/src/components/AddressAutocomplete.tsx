import { useState, useEffect, useRef, useCallback } from 'react';

interface Suggestion {
  placeName: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export function AddressAutocomplete({ value, onChange, placeholder = 'Enter address', className = '', id }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value reset (e.g. form clear)
  useEffect(() => {
    if (value === '') setQuery('');
  }, [value]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!MAPBOX_TOKEN || q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&types=address&limit=5&language=en`;
      const res = await fetch(url);
      const data = await res.json();
      const features: Suggestion[] = (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
        placeName: f.place_name,
        lng: f.center[0],
        lat: f.center[1],
      }));
      setSuggestions(features);
      setOpen(features.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  const handleSelect = (s: Suggestion) => {
    setQuery(s.placeName);
    setSuggestions([]);
    setOpen(false);
    onChange(s.placeName, s.lat, s.lng);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value, 0, 0); }}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 ${className}`}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">📍</span>
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-xl border border-neutral-300 pl-8 pr-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 ${className}`}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">…</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 text-sm text-neutral-800 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
              >
                <span className="mr-2 text-neutral-400">📍</span>
                {s.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

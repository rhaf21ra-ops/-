"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Home, Briefcase, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface LocationValue {
  lat: number;
  lng: number;
  label?: string;
  address_text?: string;
  user_address_id?: string;
}

export function LocationPicker({ value, onChange, savedAddresses, onSaveAddress }: {
  value: LocationValue | null;
  onChange: (v: LocationValue | null) => void;
  savedAddresses?: { id:string,label:string,address_text?:string,lat:number,lng:number }[];
  onSaveAddress?: (addr:{label:string,address_text:string,lat:number,lng:number})=>void;
}) {
  const [mode, setMode] = useState<'current'|'saved'>('current');
  const [lat, setLat] = useState(value?.lat?.toString() || '');
  const [lng, setLng] = useState(value?.lng?.toString() || '');
  const [label, setLabel] = useState('المنزل');
  const [addressText, setAddressText] = useState('');

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('المتصفح لا يدعم GPS'); return; }
    toast.info('جاري تحديد موقعك...');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setLat(latitude.toFixed(6)); setLng(longitude.toFixed(6));
      onChange({ lat: latitude, lng: longitude, label, address_text: addressText });
      toast.success('تم تحديد موقعك 📍');
    }, () => toast.error('فشل تحديد الموقع - تأكد من السماح بالإذن'));
  };

  useEffect(()=>{ if(lat && lng){ const la=parseFloat(lat), ln=parseFloat(lng); if(!isNaN(la)&&!isNaN(ln)) onChange({ lat:la,lng:ln,label,address_text:addressText}); }},[lat,lng,label,addressText]);

  return (
    <Card className="border-emerald-200">
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-600"/> موقع الطلب</CardTitle>
        <p className="text-xs text-muted-foreground">اختر موقعك الحالي أو اختر موقعاً محفوظاً — سيُحفظ مع الطلب ولا يتغير لاحقاً</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" variant={mode==='current'?'default':'outline'} size="sm" onClick={()=>setMode('current')} className="flex-1"><Navigation className="h-4 w-4 ml-1"/> موقعي الحالي</Button>
          <Button type="button" variant={mode==='saved'?'default':'outline'} size="sm" onClick={()=>setMode('saved')} className="flex-1"><Home className="h-4 w-4 ml-1"/> مواقعي المحفوظة</Button>
        </div>

        {mode==='current' && (
          <div className="space-y-3">
            <Button type="button" onClick={useMyLocation} className="w-full bg-emerald-600 hover:bg-emerald-700"><MapPin className="h-4 w-4 ml-2"/> استخدام موقعي الحالي 📍</Button>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Latitude</Label><Input value={lat} onChange={e=>setLat(e.target.value)} placeholder="15.3694" /></div>
              <div><Label className="text-xs">Longitude</Label><Input value={lng} onChange={e=>setLng(e.target.value)} placeholder="44.1910" /></div>
            </div>
            <div><Label className="text-xs">اسم الموقع</Label>
              <Select value={label} onValueChange={setLabel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="المنزل">🏠 المنزل</SelectItem><SelectItem value="العمل">💼 العمل</SelectItem><SelectItem value="موقع آخر">📍 موقع آخر</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs">عنوان إضافي</Label><Input value={addressText} onChange={e=>setAddressText(e.target.value)} placeholder="شارع، حي..."/></div>
            {lat && lng && (
              <div className="rounded-xl overflow-hidden border h-48 bg-muted flex items-center justify-center relative">
                <iframe
                  title="map"
                  width="100%" height="100%" loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-0.01}%2C${parseFloat(lat)-0.01}%2C${parseFloat(lng)+0.01}%2C${parseFloat(lat)+0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                />
                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded text-xs shadow">اسحب العلامة يدوياً عبر تعديل الأرقام أعلاه</div>
              </div>
            )}
          </div>
        )}

        {mode==='saved' && (
          <div className="space-y-2">
            {savedAddresses && savedAddresses.length>0 ? savedAddresses.map(a=>(
              <div key={a.id} onClick={()=>{ setLat(a.lat.toString()); setLng(a.lng.toString()); onChange({ lat:a.lat,lng:a.lng,label:a.label,address_text:a.address_text,user_address_id:a.id }); toast.success(`تم اختيار ${a.label}`); }} className={`p-3 rounded-lg border cursor-pointer flex justify-between ${value?.user_address_id===a.id?'bg-emerald-50 border-emerald-300':'hover:bg-muted'}`}>
                <div><p className="text-sm font-medium">{a.label==='المنزل'?'🏠':a.label==='العمل'?'💼':'📍'} {a.label}</p><p className="text-xs text-muted-foreground">{a.address_text || `${a.lat}, ${a.lng}`}</p></div>
                <MapPin className="h-4 w-4 text-emerald-600"/>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-6">لا توجد مواقع محفوظة — استخدم "موقعي الحالي" وأضف أول موقع</p>}
          </div>
        )}

        {value && <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">تم اختيار الموقع: {value.lat.toFixed(5)}, {value.lng.toFixed(5)} {value.label && `• ${value.label}`}</div>}
      </CardContent>
    </Card>
  );
}

"use client";

import { MapContainer, TileLayer, useMapEvents, Polygon, CircleMarker, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

type Point=[number,number];
type PolygonValue={type:"Polygon";coordinates:Point[][]};
function DrawLayer({points,onAdd}:{points:Point[];onAdd:(point:Point)=>void}){
  useMapEvents({click(event){onAdd([Number(event.latlng.lng.toFixed(6)),Number(event.latlng.lat.toFixed(6))]);}});
  return <>{points.map((p,i)=><CircleMarker key={i} center={[p[1],p[0]]} radius={5} pathOptions={{color:"#ea580c",fillColor:"#fff",fillOpacity:1}} />)}</>;
}
function Recenter({center}:{center:[number,number]}){const map=useMap();useEffect(()=>{map.setView(center,Math.max(map.getZoom(),12));},[center[0],center[1],map]);return null;}
export default function BranchCoverageMap({latitude,longitude,value,onChange}:{latitude:number;longitude:number;value:PolygonValue|null;onChange:(value:PolygonValue|null)=>void}){
  const saved=useMemo(()=>value?.coordinates?.[0]?.slice(0,-1)??[],[value]);
  const [points,setPoints]=useState<Point[]>(saved);
  useEffect(()=>{setPoints(saved);},[value?.coordinates?.[0]?.length]);
  const center:[number,number]=[latitude,longitude];
  const add=(point:Point)=>{const next=[...points,point];setPoints(next);if(next.length>=3)onChange({type:"Polygon",coordinates:[[...next,next[0]]]});};
  const clear=()=>{setPoints([]);onChange(null);};
  return <div className="overflow-hidden rounded-xl border border-gray-200">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2"><div><p className="text-xs font-semibold text-gray-800">Delivery coverage boundary</p><p className="text-[11px] text-gray-500">Tap the map to add boundary points. Add at least 3 points.</p></div><button type="button" onClick={clear} className="rounded-md border bg-white px-3 py-1.5 text-xs font-semibold">Clear area</button></div>
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-[300px] w-full">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <Recenter center={center}/>
      <DrawLayer points={points} onAdd={add}/>
      {points.length>=3&&<Polygon positions={points.map(p=>[p[1],p[0]] as [number,number])} pathOptions={{color:"#ea580c",fillColor:"#fb923c",fillOpacity:.18}}/>}
      <CircleMarker center={center} radius={7} pathOptions={{color:"#2563eb",fillColor:"#2563eb",fillOpacity:1}}/>
    </MapContainer>
    <div className="border-t bg-white px-3 py-2 text-[11px] text-gray-600">{points.length} boundary point(s) · {points.length>=3?"Coverage polygon saved in form state":"Add at least 3 points to define delivery coverage"}</div>
  </div>;
}

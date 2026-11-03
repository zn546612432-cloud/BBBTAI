#!/usr/bin/env python3
"""Produce redistributable, simplified Macau offline map geometry from Geofabrik OSM extract.

Input is the open *vector dataset* (not tile.openstreetmap.org image tiles).
Output is an ES module bundled with the game so gameplay never calls a maps API.
Geofabrik: https://download.geofabrik.de/asia/china/macau.html
Data: © OpenStreetMap contributors, ODbL 1.0.
"""
from __future__ import annotations
import argparse
import io
import json
import pathlib
import re
import urllib.request
import zipfile
import shapefile

SOURCE="https://download.geofabrik.de/asia/china/macau-latest-free.shp.zip"
OUTPUT=pathlib.Path("src/apps/maps/data/offline-macau-detail.js")
LAYERS=[
 ("gis_osm_landuse_a_free_1.shp","landuse",3800),
 ("gis_osm_natural_a_free_1.shp","park",1300),
 ("gis_osm_water_a_free_1.shp","water",1000),
 ("gis_osm_buildings_a_free_1.shp","building",18000),
 ("gis_osm_railways_free_1.shp","rail",3000),
 ("gis_osm_roads_free_1.shp","road",35000),
]
MAJOR={"motorway","trunk","primary","secondary","tertiary","motorway_link","trunk_link","primary_link","secondary_link"}
GREEN={"forest","park","grass","meadow","scrub","wood","garden","recreation_ground","nature_reserve","grassland"}
WATER={"water","wetland","reservoir","riverbank","basin"}
AREA_MIN=1e-10

def sqseg(p,a,b):
 x,y=p;ax,ay=a;bx,by=b
 dx=bx-ax;dy=by-ay
 if dx or dy:
  t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)))
  ax+=dx*t;ay+=dy*t
 return (x-ax)**2+(y-ay)**2

def rdp(points,eps):
 if len(points)<3:return points
 start,end=points[0],points[-1]
 dist,index=-1,0
 for i in range(1,len(points)-1):
  d=sqseg(points[i],start,end)
  if d>dist:dist,index=d,i
 if dist>eps*eps:
  return rdp(points[:index+1],eps)[:-1]+rdp(points[index:],eps)
 return [start,end]

def simplify_line(line,epsilon,ring=False):
 line=[[round(float(p[0]),5),round(float(p[1]),5)] for p in line]
 if not line:return []
 if ring:
  if line[0]==line[-1]:line=line[:-1]
  if len(line)<3:return []
  line=rdp(line,epsilon)
  if len(line)<3:return []
  return line+[line[0]]
 return rdp(line,epsilon)

def simplified_geometry(geom,kind):
 ty=geom.get("type")
 cs=geom.get("coordinates")
 eps=0.000015 if kind.startswith("road") else (0.00002 if kind=="building" else 0.000035)
 if ty=="LineString":
  a=simplify_line(cs,eps);return {"type":ty,"coordinates":a} if len(a)>1 else None
 if ty=="MultiLineString":
  a=[simplify_line(line,eps) for line in cs]
  a=[line for line in a if len(line)>1]
  return {"type":ty,"coordinates":a} if a else None
 if ty=="Polygon":
  a=[simplify_line(r,eps,True) for r in cs]
  a=[r for r in a if len(r)>3]
  return {"type":ty,"coordinates":a} if a else None
 if ty=="MultiPolygon":
  a=[[simplify_line(r,eps,True) for r in poly] for poly in cs]
  a=[[r for r in poly if len(r)>3] for poly in a]
  a=[poly for poly in a if poly]
  return {"type":ty,"coordinates":a} if a else None
 return None

def get_zip(url):
 req=urllib.request.Request(url,headers={"User-Agent":"XimengPhoneOfflineMaps/1.0 (GitHub Pages demo; https://github.com/zn546612432-cloud/BBBTAI)"})
 with urllib.request.urlopen(req,timeout=120) as response:
  data=response.read()
 if len(data)<10000:raise RuntimeError("Unexpected empty Geofabrik download")
 return zipfile.ZipFile(io.BytesIO(data))

def read_layer(z,name,kind,limit):
 lookup={p.split("/")[-1]:p for p in z.namelist()}
 prefix=name[:-4]
 for ext in (".shp",".shx",".dbf"):
  if prefix+ext not in lookup:return []
 reader=shapefile.Reader(
  shp=io.BytesIO(z.read(lookup[prefix+".shp"])),
  shx=io.BytesIO(z.read(lookup[prefix+".shx"])),
  dbf=io.BytesIO(z.read(lookup[prefix+".dbf"])),
  encoding="utf-8",encodingErrors="replace"
 )
 out=[]
 for item in reader.iterShapeRecords():
  if len(out)>=limit:break
  attr=item.record.as_dict()
  fclass=str(attr.get("fclass","")).lower()
  k=kind
  if kind=="landuse":
   if fclass in GREEN:k="park"
   elif fclass in WATER:k="water"
   elif fclass not in {"residential","commercial","industrial","retail","cemetery","farmland","allotments"}:continue
  if kind=="park" and fclass not in GREEN:continue
  if kind=="road":
   k="road_major" if fclass in MAJOR else "road"
   # Skip parking aisles and highly detailed footpaths, keeping all main streets.
   if fclass in {"steps","path","track","bridleway","footway","pedestrian","cycleway","living_street","service"}:continue
  if kind=="building" and fclass in {"ruins","roof"}:continue
  try:geometry=simplified_geometry(item.shape.__geo_interface__,k)
  except Exception:continue
  if not geometry:continue
  out.append({"type":"Feature","properties":{"kind":k},"geometry":geometry})
 return out

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--source",default=SOURCE)
 parser.add_argument("--output",default=str(OUTPUT))
 args=parser.parse_args()
 with get_zip(args.source) as z:
  print("Geofabrik layers",len(z.namelist()))
  features=[]
  for fname,kind,limit in LAYERS:
   layer=read_layer(z,fname,kind,limit)
   print(fname,len(layer))
   if kind=="road" and not layer:raise RuntimeError("Roads missing, refusing incomplete offline map")
   features.extend(layer)
 obj={
  "type":"FeatureCollection",
  "metadata":{"source":"Geofabrik Macau / OpenStreetMap","license":"ODbL-1.0","sourceUrl":args.source,"detail":"full-roads"},
  "features":features
 }
 output=pathlib.Path(args.output)
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text("export const OFFLINE_DETAILS = "+json.dumps(obj,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
 print(f"Wrote {output} ({output.stat().st_size:,} bytes, {len(features):,} features)")

if __name__=="__main__":main()

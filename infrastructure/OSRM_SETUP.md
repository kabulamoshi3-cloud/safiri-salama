# OSRM Setup Guide for Safiri Haraka

This guide walks you through setting up the OSRM (Open Source Routing Machine) routing engine for offline routing in Dar es Salaam.

## Prerequisites

- Docker installed and running
- ~500MB free disk space for Tanzania OSM data
- Internet connection for initial download

## Step 1: Create OSRM Data Directory

```bash
cd infrastructure
mkdir osrm-data
cd osrm-data
```

## Step 2: Download Tanzania OSM Extract

Download the latest Tanzania extract from Geofabrik:

**Option A: Direct Download (Windows)**
```powershell
# Download using PowerShell
Invoke-WebRequest -Uri "https://download.geofabrik.de/africa/tanzania-latest.osm.pbf" -OutFile "tanzania-latest.osm.pbf"
```

**Option B: Manual Download**
1. Visit: https://download.geofabrik.de/africa/tanzania.html
2. Download `tanzania-latest.osm.pbf` (~120 MB)
3. Place it in the `osrm-data` directory

**Option C: Smaller Extract (Dar es Salaam only)**
For faster processing during development, you can use a smaller extract:
```powershell
# If you want just Dar es Salaam region (smaller, faster)
# Use osmium-tool or download a custom extract from:
# https://download.geofabrik.de/africa/tanzania.html
```

## Step 3: Preprocess the Map Data

This step prepares the OSM data for fast routing queries. Run these commands in order:

### 3.1 Extract (5-10 minutes for Tanzania)

```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tanzania-latest.osm.pbf
```

This creates `tanzania-latest.osrm` and related files.

### 3.2 Partition (2-5 minutes)

```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/tanzania-latest.osrm
```

### 3.3 Customize (1-2 minutes)

```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/tanzania-latest.osrm
```

## Step 4: Start OSRM Service

Navigate back to the infrastructure directory and start all services:

```bash
cd ..
docker compose up -d
```

The OSRM service will start automatically and be available at `http://localhost:5000`

## Step 5: Test OSRM

### Test Basic Routing

```bash
# Route from Kariakoo to Mbezi Beach
curl "http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311?overview=full&geometries=geojson"
```

### Test with PowerShell

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311?overview=false"
$response.routes[0] | Select-Object distance, duration
```

Expected output:
```
distance : 15234.5  (meters)
duration : 1423.2   (seconds)
```

## OSRM API Endpoints

Once running, OSRM provides several useful endpoints:

### Route Service
```
GET /route/v1/{profile}/{coordinates}
```
Example:
```
http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311?overview=full&geometries=geojson
```

### Nearest Service
Find nearest street coordinate:
```
GET /nearest/v1/{profile}/{coordinate}
```
Example:
```
http://localhost:5000/nearest/v1/driving/39.2731,-6.8206
```

### Table Service
Distance matrix for multiple points:
```
GET /table/v1/{profile}/{coordinates}
```

### Match Service
GPS trace matching to roads:
```
GET /match/v1/{profile}/{coordinates}
```

## Multiple Routing Profiles

To support different transport modes, you'll need to preprocess multiple profiles:

### Motorcycle Profile
```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/motorcycle.lua /data/tanzania-latest.osm.pbf
# Rename output files to motorcycle-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/motorcycle-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/motorcycle-latest.osrm
```

### Bicycle Profile
```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/bicycle.lua /data/tanzania-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/bicycle-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/bicycle-latest.osrm
```

### Foot Profile
```bash
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/foot.lua /data/tanzania-latest.osm.pbf
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/foot-latest.osrm
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/foot-latest.osrm
```

## Updating Map Data

To update with fresh OSM data:

1. Download new `tanzania-latest.osm.pbf`
2. Stop OSRM: `docker compose stop osrm`
3. Re-run preprocessing steps (extract, partition, customize)
4. Restart OSRM: `docker compose start osrm`

## Troubleshooting

### OSRM container fails to start
- Check that preprocessing completed successfully
- Verify `tanzania-latest.osrm` and `.osrm.ebg`, `.osrm.fileIndex`, `.osrm.cells` files exist
- Check Docker logs: `docker compose logs osrm`

### Out of memory during preprocessing
- Use a smaller OSM extract (Dar es Salaam region only)
- Increase Docker memory limit in Docker Desktop settings

### Routing returns errors
- Ensure coordinates are in `longitude,latitude` order (not lat,lng)
- Verify coordinates are within Tanzania bounds
- Check coordinates are in decimal degrees format

## Performance Notes

- First routing query may be slow (1-2 seconds) while OSRM loads data into memory
- Subsequent queries are fast (<50ms typical)
- OSRM uses ~1-2GB RAM for Tanzania extract
- Disk space: ~500MB for preprocessed files

## Next Steps

After OSRM is running:
1. Implement Trip Planner Service (Task 27) to use OSRM
2. Implement fare estimation (Task 27a) using OSRM route data
3. Test with the GPS simulator (Task 57)

## References

- OSRM Documentation: https://project-osrm.org/
- Geofabrik Downloads: https://download.geofabrik.de/
- OSRM GitHub: https://github.com/Project-OSRM/osrm-backend

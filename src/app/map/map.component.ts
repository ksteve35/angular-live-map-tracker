import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { environment } from '@environments/environment'

import route1Data from '../../assets/routes/route1.json'
import route2Data from '../../assets/routes/route2.json'
import route3Data from '../../assets/routes/route3.json'

import { Feature, FeatureCollection, Point, Position } from 'geojson'
import { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {
  private map!: MapboxMap
  private routes: [number, number][][] = []
  private routesIndices: number[] = []
  private timers: any[] = []
  public truckPositions: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: []
  }

  ngOnInit(): void {
    // Initialize the Mapbox map
    this.initializeMap()
  }

  initializeMap(): void {
    this.map = new MapboxMap({
      container: 'map', // ID of the container element
      accessToken: environment.mapboxToken, // Mapbox access token from environment variables
      style: 'mapbox://styles/mapbox/streets-v12', // Map style URL
      attributionControl: false, // Disable default attribution control
      center: [-83.761868, 42.281902], // Initial map center as [longitude, latitude]
      zoom: 15 // Initial map zoom level
    })

    // Initialize routes after the map has loaded and draw them on the map
    this.map.on('load', () => {
      this.initializeRoutes()
      // Add a GeoJSON source for the simulated truck positions
      this.map.addSource('trucks-source', {
        type: 'geojson',
        data: this.truckPositions
      })
      // Add a layer to display the simulated truck positions
      this.map.addLayer({
        id: 'trucks-layer',
        type: 'circle',
        source: 'trucks-source',
        paint: {
          'circle-radius': 10,
          'circle-color': ['get', 'color'], // Each truck gets a unique color
          'circle-stroke-width': 1,
          'circle-stroke-color': '#FFF'
        }
      })
      // Add the truck bearing layer
      this.map.addLayer({
        id: 'trucks-bearing-layer',
        type: 'symbol',
        source: 'trucks-source',
        layout: {
          'text-field': '◤',
          'text-size': 22,
          'text-rotation-alignment': 'map',
          'text-rotate': ['+', ['get', 'bearing'], 45], // Adjust rotation to align with bearing
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': 'black'
        }
      })
      // Start simulated truck movement
      this.startTruckMovement()
    })
  }

  initializeRoutes(): void {
    const routeFiles = [route1Data, route2Data, route3Data]
    const colors = ['#FF0000', '#00AA00', '#8585FF']
    routeFiles.forEach(
      (data: { name: string; route: number[][][] }, index: number) => {
        // Ensure the route data is in the expected format
        const routeCoordinates = data.route as [number, number][][]
        this.routes.push(routeCoordinates[0])
        this.routesIndices.push(0)

        // Add the truck position features for each route
        this.truckPositions.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: routeCoordinates[0][0]
          },
          properties: {
            id: index,
            color: colors[index]
          }
        })
      }
    )
  }

  startTruckMovement(): void {
    this.truckPositions.features.forEach((truck, index) => {
      // Start each truck's loop
      this.moveTruck(truck, index)
    })
  }

  moveTruck(truck: Feature<Point>, index: number): void {
    const currentRoute = this.routes[index]
    let currentRouteIndex = this.routesIndices[index]++

    // If the truck has reached the end of its route, reset to the start
    if (currentRouteIndex >= currentRoute.length) {
      currentRouteIndex = 0
    }

    const currentCoord = currentRoute[currentRouteIndex]
    const nextCoord =
      currentRouteIndex + 1 < currentRoute.length
        ? currentRoute[currentRouteIndex + 1]
        : currentRoute[0]

    // Adding jitter to next coordinate to simulate slight inaccuracy in GPS
    const jitter = 0.00004 // ~4m latitude
    const lng = currentCoord[0]
    const lat = currentCoord[1]
    const wiggleLng = lng + (Math.random() - 0.5) * jitter
    const wiggleLat = lat + (Math.random() - 0.5) * jitter

    // Calculate bearing towards next point
    const bearing = this.calculateBearing([wiggleLng, wiggleLat], nextCoord)

    // Move truck to the next coordinate on its route
    truck.geometry.coordinates = [wiggleLng, wiggleLat]
    truck.properties = {
      ...truck.properties,
      bearing
    }

    // Update the map
    const source: GeoJSONSource | undefined =
      this.map.getSource('trucks-source')
    source?.setData(this.truckPositions)

    // Schedule next movement
    const nextTimeout = Math.random() * 3000 + 2000 // Random timer between 2-5 seconds
    this.timers[index] = setTimeout(
      () => this.moveTruck(truck, index),
      nextTimeout
    )
  }

  calculateBearing(a: [number, number], b: [number, number]): number {
    // Helper functions to conver between degrees and radians
    const toRad = (deg: number): number => (deg * Math.PI) / 180
    const toDeg = (rad: number): number => (rad * 180) / Math.PI

    // Calculate the bearing between points a and b
    const radLat1: number = toRad(a[1])
    const radLat2: number = toRad(b[1])
    const deltaLng: number = toRad(b[0] - a[0])

    // Calculate and return the bearing
    const x: number = Math.sin(deltaLng) * Math.cos(radLat2)
    const y: number =
      Math.cos(radLat1) * Math.sin(radLat2) -
      Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(deltaLng)
    const bearing: number = (toDeg(Math.atan2(x, y)) + 360) % 360
    return bearing
  }

  zoomToTruck(coordinates: Position): void {
    this.map.flyTo({
      center: [coordinates[0], coordinates[1]],
      zoom: 18,
      essential: true,
      speed: 1.2
    })
  }
}

import { Component, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { environment } from '@environments/environment'

import { Feature, FeatureCollection, Point, Position } from 'geojson'
import { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

import { DeliveryTruckLocationService } from '../delivery-truck-location.service'

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {
  private followTruckIntervalId: any
  public followTruckId: number | undefined
  private map!: MapboxMap
  private routesIndices: number[] = []
  private timers: any[] = []
  public truckPositions: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: []
  }

  constructor(private deliveryTruckLocationService: DeliveryTruckLocationService) {}

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

    this.map.on('dragstart', () => {
      // Stop following truck when map is dragged
      this.stopFollowingTruck()
    })
  }

  initializeRoutes(): void {
    this.routesIndices = new Array(this.deliveryTruckLocationService.getRoutes().length).fill(0)
    this.truckPositions = this.deliveryTruckLocationService.getTruckPositions()
  }

  startTruckMovement(): void {
    this.truckPositions.features.forEach((truck, index) => {
      // Start each truck's loop
      this.moveTruck(truck, index)
    })
  }

  moveTruck(truck: Feature<Point>, index: number): void {
    // Get the route from the delivery truck location service
    const currentRoute: [number, number][] =
      this.deliveryTruckLocationService.getRoutes()[index].route[0]
    // Increment the index to move to the next coordinate on the route
    let currentRouteIndex: number = this.routesIndices[index]++
    let nextRouteIndex: number = currentRouteIndex + 1

    // If the truck has reached the end of its route, reset to the start
    if (currentRouteIndex >= currentRoute.length) {
      currentRouteIndex = 0
    }

    const currentCoord: [number, number] = currentRoute[currentRouteIndex]
    const nextCoord: [number, number] =
      nextRouteIndex < currentRoute.length
        ? currentRoute[nextRouteIndex]
        : currentRoute[0]

    // Adding jitter to next coordinate to simulate slight inaccuracy in GPS
    const jitter: number = 0.00004 // ~4m latitude
    const lng: number = currentCoord[0]
    const lat: number = currentCoord[1]
    const wiggleLng: number = lng + (Math.random() - 0.5) * jitter
    const wiggleLat: number = lat + (Math.random() - 0.5) * jitter

    // Calculate bearing towards next point
    const bearing: number = this.calculateBearing([wiggleLng, wiggleLat], nextCoord)

    // Move truck to the next coordinate on its route
    truck.geometry.coordinates = [wiggleLng, wiggleLat]
    truck.properties = {
      ...truck.properties,
      bearing
    }

    // Update the map
    const source: GeoJSONSource | undefined = this.map.getSource('trucks-source')
    source?.setData(this.truckPositions)

    // Schedule next movement
    const nextTimeout: number = Math.random() * 3000 + 2000 // Random timer between 2-5 seconds
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
      speed: 1.2
    })
  }

  followTruck(truck: Feature<Point>): void {
    // Stop any existing follow truck interval
    this.stopFollowingTruck()
    // Set up an interval to follow the selected truck every 100ms
    this.followTruckIntervalId = setInterval(() => this.followTruckInterval(truck), 100)
    this.followTruckInterval(truck) // Call immediately to jump to the truck's position
  }

  followTruckInterval(truck: Feature<Point>): void {
    if (truck.properties) {
      this.followTruckId = truck.properties['id']
      const coordinates = truck.geometry.coordinates
      this.map.flyTo({
        center: [coordinates[0], coordinates[1]],
        zoom: 18,
        speed: 1.2
      })
    }
  }

  stopFollowingTruck(): void {
    // Clear any existing follow truck interval
    if (this.followTruckIntervalId !== undefined) {
      clearInterval(this.followTruckIntervalId)
      this.followTruckIntervalId = undefined
      this.followTruckId = undefined
    }
  }
}

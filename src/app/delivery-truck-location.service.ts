import { Injectable } from '@angular/core'

import routeData from '../assets/routes/routeData.json'

import { FeatureCollection, Point } from 'geojson'

import { BehaviorSubject, Observable } from 'rxjs'

interface TruckRoute {
  name: string
  color: string
  route: [number, number][][]
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryTruckLocationService {
  private positionsFeatureCollection: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: []
  }
  private positionsSubject = new BehaviorSubject<FeatureCollection<Point>>(
    this.positionsFeatureCollection
  )
  private routes: TruckRoute[] = []
  private routeIndices: number[] = []

  constructor() {
    this.routes = this.loadRawRoutes().map(data => ({
      name: data.name,
      color: data.color,
      route: data.route
    }))

    // Fill the route indices array with zeros as starting values for each truck
    this.routeIndices = new Array(this.routes.length).fill(0)

    // Start emitting positions
    this.startSimulation()
  }

  loadRawRoutes(): TruckRoute[] {
    return routeData.routes as any
  }

  startSimulation() {
    this.routes.forEach((_, index) => {
      this.moveTrucks(index)
      this.scheduleNextTruckMovement(index)
    })
  }

  scheduleNextTruckMovement(index: number): void {
    // Random time between 2-5 seconds
    const randomTime = Math.random() * 3000 + 2000
    setTimeout(() => {
      this.moveTrucks(index)
      this.scheduleNextTruckMovement(index)
    }, randomTime)
  }

  getTruckPositionsObservable(): Observable<FeatureCollection<Point>> {
    return this.positionsSubject.asObservable()
  }

  getTruckPositions(): FeatureCollection<Point> {
    return this.positionsFeatureCollection
  }

  moveTrucks(truckIndex: number): void {
    // Map over each truck route to compute the truck feature's new position
    this.routes.forEach((truckRoute, index) => {
      if (index == truckIndex) {
        const currentRoute: [number, number][][] = truckRoute.route
        // Increment the index to move to the next coordinate on the route
        let currentRouteIndex: number =
          index == truckIndex
            ? this.routeIndices[index]++
            : this.routeIndices[index]
        let nextRouteIndex: number = currentRouteIndex + 1

        // If the truck has reached the end of its route, reset to the start
        if (currentRouteIndex >= currentRoute[0].length) {
          currentRouteIndex = 0
          this.routeIndices[index] = 0
        }

        // Get the current and next coordinates for the truck
        const currentCoord: [number, number] =
          currentRoute[0][currentRouteIndex]
        const nextCoord: [number, number] =
          nextRouteIndex < currentRoute[0].length
            ? currentRoute[0][nextRouteIndex]
            : currentRoute[0][0]

        // Adding jitter to next coordinate to simulate slight inaccuracy in GPS
        const jitter: number = 0.00004 // ~4m latitude
        const wiggleLng: number =
          currentCoord[0] + (Math.random() - 0.5) * jitter
        const wiggleLat: number =
          currentCoord[1] + (Math.random() - 0.5) * jitter

        // Calculate bearing toward next point
        const bearing: number = this.calculateBearing(
          [wiggleLng, wiggleLat],
          nextCoord
        )
        // Update the position of the truck that moved
        // Return a GeoJSON Feature representing the truck's new position and bearing
        this.positionsFeatureCollection.features[truckIndex] = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [wiggleLng, wiggleLat]
          },
          properties: {
            id: index,
            color: truckRoute.color,
            bearing
          }
        }
      }
    })

    // Emit the updated FeatureCollection
    this.positionsSubject.next(this.positionsFeatureCollection)
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
}

import { Component, OnInit } from '@angular/core'
import { environment } from '@environments/environment'

import route1Data from '../../assets/routes/route1.json'
import route2Data from '../../assets/routes/route2.json'
import route3Data from '../../assets/routes/route3.json'

import { FeatureCollection, Point } from 'geojson'
import { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {
  private map!: MapboxMap
  private routes: [number, number][][] = []
  private routesIndices: number[] = []
  private timers: any[] = []
  private truckPositions: FeatureCollection<Point> = {
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
      // Start simulated truck movement
      this.startTruckMovement()
    })
  }

  initializeRoutes(): void {
    const routeFiles = [route1Data, route2Data, route3Data]
    const colors = ['#FF0000', '#00AA00', '#0000FF']
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
      const moveTruck = () => {
        const currentRoute = this.routes[index]
        let currentRouteIndex = this.routesIndices[index]++

        // If the truck has reached the end of its route, reset to the start
        if (currentRouteIndex >= currentRoute.length) {
          currentRouteIndex = 0
        }

        // Adding jitter to next coordinate to simulate slight inaccuracy in GPS
        const jitter = 0.00004 // ~4m latitude
        const lng = currentRoute[currentRouteIndex][0]
        const lat = currentRoute[currentRouteIndex][1]
        const wiggleLng = lng + (Math.random() - 0.5) * jitter
        const wiggleLat = lat + (Math.random() - 0.5) * jitter

        // Move truck to the next coordinate on its route
        truck.geometry.coordinates = [wiggleLng, wiggleLat]

        // Update the map
        const source: GeoJSONSource | undefined =
          this.map.getSource('trucks-source')
        source?.setData(this.truckPositions)

        // Schedule next movement
        const nextTimeout = Math.random() * 3000 + 2000 // Random timer between 2-5 seconds
        this.timers[index] = setTimeout(moveTruck, nextTimeout)
      }

      // Start each truck's loop
      moveTruck()
    })
  }
}

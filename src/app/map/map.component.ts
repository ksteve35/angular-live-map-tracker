import { Component, OnInit } from '@angular/core'
import { environment } from '@environments/environment'

import route1Data from '../../assets/routes/route1.json'
import route2Data from '../../assets/routes/route2.json'
import route3Data from '../../assets/routes/route3.json'

import { Feature, FeatureCollection, Polygon } from 'geojson'
import { Map as MapboxMap } from 'mapbox-gl'

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {
  private map!: MapboxMap
  private routeSourceData: FeatureCollection<Polygon> = {
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
      // Add a GeoJSON source for the simulated routes
      this.map.addSource('routes-source', {
        type: 'geojson',
        data: this.routeSourceData
      })
      // Add a layer to display the simulated routes
      this.map.addLayer({
        id: 'routes-layer',
        type: 'line',
        source: 'routes-source',
        paint: {
          'line-color': '#3061E6',
          'line-width': 3
        }
      })
    })
  }

  initializeRoutes(): void {
    const routes = [route1Data, route2Data, route3Data]
    routes.forEach((data: { name: string; route: number[][][] }) => {
      // Ensure the route data is in the expected format
      const routeCoordinates = data.route as [number, number][][]
      // Convert the route coordinates to a GeoJSON Polygon feature
      const routeFeature: Feature<Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [routeCoordinates[0].map(coord => [coord[0], coord[1]])]
        },
        properties: {
          name: data.name
        }
      }

      // Add the route feature to the source data
      this.routeSourceData.features.push(routeFeature)
    })
  }
}

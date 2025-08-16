import { Component, OnInit } from '@angular/core'
import { environment } from '@environments/environment'
import route1Data from 'src/assets/routes/route1.json'
import route2Data from 'src/assets/routes/route2.json'
import route3Data from 'src/assets/routes/route3.json'
import { Map as MapboxMap } from 'mapbox-gl'

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {
  private map!: MapboxMap
  private routes: [number, number][][] = []

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
    })
  }

  initializeRoutes(): void {
    this.routes.push(route1Data.route[0] as [number, number][])
    this.routes.push(route2Data.route[0] as [number, number][])
    this.routes.push(route3Data.route[0] as [number, number][])
  }
}

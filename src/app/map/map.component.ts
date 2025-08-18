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
  public truckPositions: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: []
  }

  constructor(private deliveryTruckLocationService: DeliveryTruckLocationService) {}

  ngOnInit(): void {
    // Initialize the Mapbox map
    this.initializeMap()
    this.initializeTruckPositions()

    this.deliveryTruckLocationService.getTruckPositionsObservable().subscribe(
      (positions: FeatureCollection<Point>) => {
        this.truckPositions = positions
        const source: GeoJSONSource | undefined = this.map?.getSource('trucks-source')
        if (source) {
          source.setData(this.truckPositions)
        }
      }
    )
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
    })

    this.map.on('dragstart', () => {
      // Stop following truck when map is dragged
      this.stopFollowingTruck()
    })
  }

  initializeTruckPositions(): void {
    this.truckPositions = this.deliveryTruckLocationService.getTruckPositions()
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

import { Injectable } from '@angular/core'

import route1Data from '../assets/routes/route1.json'
import route2Data from '../assets/routes/route2.json'
import route3Data from '../assets/routes/route3.json'

import { FeatureCollection, Point } from 'geojson'

interface TruckRoute {
  name: string
  color: string
  route: [number, number][][]
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryTruckLocationService {
  private routes: TruckRoute[] = []

  constructor() {
    this.routes = this.loadRawRoutes().map(
      data => ({
        name: data.name,
        color: data.color,
        route: data.route as [number, number][][]
      })
    )
  }

  loadRawRoutes(): TruckRoute[] {
    return [
      route1Data as TruckRoute,
      route2Data as TruckRoute,
      route3Data as TruckRoute
    ]
  }

  getRoutes(): TruckRoute[] {
    return this.routes
  }

  getTruckPositions(): FeatureCollection<Point> {
    return {
      type: 'FeatureCollection',
      features: this.routes.map((truckRoute, index) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: truckRoute.route[0][0]
        },
        properties: {
          id: index,
          color: truckRoute.color
        }
      }))
    }
  }
}

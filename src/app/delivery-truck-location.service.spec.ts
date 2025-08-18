import { TestBed } from '@angular/core/testing'

import { DeliveryTruckLocationService } from './delivery-truck-location.service'

describe('DeliveryTruckLocationService', () => {
  let service: DeliveryTruckLocationService

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(DeliveryTruckLocationService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})

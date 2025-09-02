import { TestBed } from '@angular/core/testing';

import { NameDay } from './name-day';

describe('NameDay', () => {
  let service: NameDay;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NameDay);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

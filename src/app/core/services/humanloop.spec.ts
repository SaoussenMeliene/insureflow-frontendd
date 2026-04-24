import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { HumanloopService } from './humanloop';

describe('HumanloopService', () => {
  let service: HumanloopService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(HumanloopService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

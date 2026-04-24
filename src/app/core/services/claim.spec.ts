import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ClaimService } from './claim';

describe('ClaimService', () => {
  let service: ClaimService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(ClaimService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

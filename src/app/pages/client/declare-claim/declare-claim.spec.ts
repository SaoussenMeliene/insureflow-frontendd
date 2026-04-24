import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { DeclareClaim } from './declare-claim';

describe('DeclareClaim', () => {
  let component: DeclareClaim;
  let fixture: ComponentFixture<DeclareClaim>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeclareClaim],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DeclareClaim);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MyClaims } from './my-claims';

describe('MyClaims', () => {
  let component: MyClaims;
  let fixture: ComponentFixture<MyClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyClaims],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MyClaims);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

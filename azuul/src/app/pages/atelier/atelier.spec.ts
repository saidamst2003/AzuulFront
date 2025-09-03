import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AteliersComponent } from './atelier';

describe('Atelier', () => {
  let component: AteliersComponent;
  let fixture: ComponentFixture<AteliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AteliersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AteliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

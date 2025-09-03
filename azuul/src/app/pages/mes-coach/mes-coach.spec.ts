import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesCoach } from './mes-coach';

describe('PauseCafee', () => {
  let component: MesCoach;
  let fixture: ComponentFixture<MesCoach>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesCoach]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesCoach);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

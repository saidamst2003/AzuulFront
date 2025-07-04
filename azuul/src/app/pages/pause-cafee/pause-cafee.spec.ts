import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PauseCafee } from './pause-cafee';

describe('PauseCafee', () => {
  let component: PauseCafee;
  let fixture: ComponentFixture<PauseCafee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PauseCafee]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PauseCafee);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

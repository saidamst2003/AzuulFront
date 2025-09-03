import { Component } from '@angular/core';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-mes-coach',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './mes-coach.html',
  styleUrl: './mes-coach.css'
})
export class PauseCafe {}

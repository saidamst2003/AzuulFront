import { Component } from '@angular/core';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-pause-cafee',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './pause-cafee.html',
  styleUrl: './pause-cafee.css'
})
export class PauseCafe {}

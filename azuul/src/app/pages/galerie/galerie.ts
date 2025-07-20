import { Component } from '@angular/core';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-galerie',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './galerie.html',
  styleUrl: './galerie.css'
})
export class Galerie {}

import { Component } from '@angular/core';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';

@Component({
  selector: 'app-atelier',
  imports: [Navbar, Footer],
  templateUrl: './atelier.html',
  styleUrl: './atelier.css'
})
export class Atelier {

}

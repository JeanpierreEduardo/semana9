import '../auth/auth.js';
import {mostrarCatalogo} from '../catalogo/catalogo.js';
await mostrarCatalogo(document.querySelector('.grid-peliculas'),'cartelera');
